# Lead Scoring & AI
**Completion:** 78%  |  **Priority:** P2  |  **Business Impact:** High

## Purpose & Business Goal
Two fused sub-systems: (1) a **rule-based scoring/qualification/assignment engine** that runs automatically on every lead ingestion — scores the lead, buckets it hot/warm/cold, marks eligibility, and auto-assigns to a telecaller (round-robin or rule-based); and (2) **Lead AI** — LLM-generated per-lead sales intelligence: narrative summary, key insights, seriousness score (1–10), conversion probability, next-best-action, multilingual WhatsApp follow-up drafts, and a call talk-track. Together they let telecallers prioritize the right leads and walk into calls prepared.

## Primary Users & Roles
- **TENANT_ADMIN** (`manage_leads`) — configures scoring rules, runs bulk AI generation, rescore-all.
- **STAFF / Telecaller** (`view_leads`, `create_leads`, `edit_leads`) — reads AI summaries, next-action, follow-up messages, talk-tracks per lead.

## Key Files (traced)
- `server/src/services/leadScoringService.ts` (486) — **holds two parallel engines**: a functional API (`scoreAndAssignLead`, used by ingestion) over `LeadScoringConfig`, and a `LeadScoringService` class over `LeadPriorityConfig` (used by leadPriorityController).
- `server/src/services/leadAIService.ts` (412) — `generateSummary`, `generateQuickInsights` (rule-based), `getOrGenerateSummary` (24h cache), `generateFollowUpMessage`, `generateTalkTrack`.
- `server/src/services/aiClients.ts` — `getOpenAI()` (key from Platform Settings → env). Also exposes `getAnthropic()` but AI here uses OpenAI.
- Routes/controllers: `leadScoringRoutes.ts` (16) + `leadScoringController.ts` (110); `leadAIRoutes.ts` (99) + `leadAIController.ts` (317).
- Model: `LeadScoringConfig.ts` (115).
- Frontend: `LeadScoringSettings/index.tsx` (795) — polished 3-tab settings; AI surfaced only via a summary button in `LeadDetail`.

## Dependencies & Connected Modules
- Invoked by **Lead Management** `createLead`, WhatsApp qualification (`finalizeQualification`), Meta/Google Ads ingestion, Google Sheet sync — all call `scoreAndAssignLead`.
- Overlaps/**conflicts with Lead Distribution** — both write `Lead.assignedTo` in the same create flow (`leadController.ts:456` scoreAndAssign + `:468` autoAssignLead) → double-assignment race.
- Reads `LeadScoringConfig`, `LeadPriorityConfig`, `User`; writes `Lead.score/priority/eligibility/assignedTo/aiSummary`.

## Entry / Exit Points
- Scoring: `GET|PUT /lead-scoring/config`, `GET /lead-scoring/team-members`, `POST /lead-scoring/rescore-all` (all `manage_leads`).
- AI: `GET /lead-ai/status` (auth only, **no roleGuard**), `GET /lead-ai/pending`, `POST /lead-ai/bulk-generate`, `POST /lead-ai/leads/:leadId/generate`, `GET /leads/:leadId/summary|insights|next-action|followup-message|talk-track`.

## Database Tables & Relationships
- `LeadScoringConfig` (unique per tenant): `scoringRules[]`, `hotThreshold` (12), `warmThreshold` (8), `qualificationRules[]`, `assignmentMode` (none/round_robin/rule_based), `roundRobinMembers[]`+index, `assignmentRules[]` (per-rule index), `fallbackMembers[]`+index.
- `LeadPriorityConfig` — separate second engine (different operators/derived fields like `noReplyHours`, `daysSinceCreated`).
- `Lead.aiSummary{summary,keyInsights,suggestedNextAction,conversionProbability,seriousnessScore,generatedAt,generatedBy}`.

## Events / Notifications / Emails / WhatsApp
- Auto-assignment writes `Lead.assignedTo`; hot-lead socket alerts fire from Lead Management. Follow-up message generation is on-demand (copy returned to UI, not auto-sent).

## AI Features (which model, or "None")
OpenAI (via `getOpenAI()`):
- `generateSummary` → **`gpt-4-turbo-preview`** (temp 0.7, max 1000, JSON mode) — `leadAIService.ts:42`.
- `generateFollowUpMessage` → **`gpt-4-turbo-preview`** (temp 0.8, max 200) — `:307`.
- `generateTalkTrack` → **`process.env.OPENAI_MODEL || 'gpt-4o-mini'`** — `:363` (only one using the cheap model + env override).
- `generateQuickInsights` → rule-based, no LLM.
- Inconsistency: controller writes `generatedBy:'openai'` while service writes `generatedBy:'gpt-4-turbo-preview'`.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| OpenAI gpt-4-turbo-preview | Summary + follow-up | ~₹1–3 per summary (up to 1000 out-tokens) | Priciest tier still wired; migrate to gpt-4o-mini to cut cost |
| OpenAI gpt-4o-mini | Talk-track | ~₹0.05–0.2 each | Cheap; used only for talk-track |
| — | No per-tenant cost caps / token budgeting | — | Bulk-generate can fan out across all leads |

## Validation Rules & Edge Cases
- Config lookup 3-tier fallback (active → any-with-rules → needs_review).
- Round-robin uses atomic `findOneAndUpdate {$inc}` (concurrency-safe).
- `seriousnessScore` clamped 1–10; `conversionProbability` normalized.
- 24h summary cache; bulk generation batched (5 at a time, 1s delay) to dodge rate limits.
- Hard-coded EN/TE/HI follow-up fallbacks on error/no-key.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 90 | Both engines + all AI methods implemented; minor field/provenance bugs. |
| Frontend/UI | 65 | Scoring settings page complete; AI UI only surfaces summary — talk-track & follow-up endpoints have **no frontend callers**. |
| API | 95 | Full, registered surface. |
| Database | 90 | Complete; but `getLeadsNeedingSummary` queries `aiSummary.lastGeneratedAt` while code writes `generatedAt` → "pending" query effectively broken. |
| Automation | 90 | Auto-scores on every ingestion path; rescore-all present. |
| AI | 80 | Real OpenAI with caching/fallback; provenance/model inconsistency, 2 orphaned features. |
| Testing | 0 | No tests. |
| **Overall** | **78** | Strong backend + one polished admin page; AI half-surfaced with real bugs. |

## Gaps (mark "Not Implemented")
- **Orphaned endpoints:** `talk-track` and `followup-message` have full backends but **zero frontend callers** — dead until UI added.
- **`getLeadsNeedingSummary` broken:** field-name mismatch (`lastGeneratedAt` vs `generatedAt`).
- **Two divergent scoring engines** (`LeadScoringConfig` functional vs `LeadPriorityConfig` class) — no unification.
- **Double-assignment race** with Lead Distribution.
- **No input validation** on rule payloads in `updateConfig` (raw `$set` of body).
- `/lead-ai/status` has no roleGuard.
- `bulkGenerateSummaries` doesn't validate `leadIds` is an array.
- Heavy `console.log` instrumentation left in `scoreAndAssignLead`.
- **Testing:** Not Implemented.
- Hindi follow-up fallback string mixes Telugu greeting — copy defect.

## Technical Debt / Performance / Security / Scalability
- **Debt:** two competing engines + two settings pages; provenance inconsistency.
- **Cost/perf:** gpt-4-turbo-preview on every summary is expensive; no per-tenant caps; bulk-generate unbounded fan-out.
- **Security:** raw `$set` of config body (rule injection risk); status endpoint unguarded.

## Suggestions & AI Opportunities
- Unify to one scoring engine + one settings page. Migrate summary/follow-up to gpt-4o-mini or gpt-4o. Fix `generatedAt` field. Wire talk-track/follow-up UI into LeadDetail. Add token budgeting + per-tenant AI cost caps. Add validation on rule payloads.
- **AI:** auto-summary on ingestion; predictive conversion model trained on historical outcomes; AI-suggested scoring rules from won/lost data.

## Estimated Dev Effort
- Unify engines: 4–6 days. Fix bugs (field name, provenance, validation): 2 days. Wire orphaned AI UI: 2–3 days. Cost controls: 2 days. Tests: 3 days. **Total to ~90%: ~2.5–3 weeks.**
