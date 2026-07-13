# Sales Enablement
**Completion:** 60%  |  **Priority:** P3  |  **Business Impact:** Medium

## Purpose & Business Goal
Two related features: (1) **Sales Content Library** — a per-tenant repository of sales collateral (curriculum PDFs, fee sheets, placement stats, brochures, videos, offers) telecallers browse, feature, and "share" with leads, with share/view/download tracking; (2) **Sales Call Recording** — salespeople upload recorded sales calls; the system transcribes them (Whisper) and runs an AI "sales coach" analysis (GPT) producing a 0–100 quality score across 6 coaching dimensions for QA/coaching. Helps ramp and coach the sales team.

## Primary Users & Roles
- **TENANT_ADMIN** (`manage_leads`) — manage content, view analytics.
- **STAFF / Telecaller** (`view_leads`, `edit_leads`, `create_leads`) — browse/share content, upload recordings. Recording endpoints have **no role guard** (auth only).

## Key Files (traced)
- `server/src/models/SalesContent.ts` (220), `SalesCallRecording.ts` (106).
- `server/src/services/salesCallRecordingService.ts` (162) — Whisper + GPT pipeline.
- `server/src/controllers/salesContentController.ts` (475) + `routes/salesContentRoutes.ts` (186).
- `server/src/controllers/salesCallRecordingController.ts` (192) + `routes/salesCallRecordingRoutes.ts` (36).
- `client/src/pages/SalesContentLibrary/index.tsx` (504). **No recording UI page found.**

## Dependencies & Connected Modules
- **Lead Management** (share logs a lead activity; recordings ref `leadId`), **aiClients** (OpenAI via raw axios).

## Entry / Exit Points
- Content: `GET /categories|featured|by-category|analytics|/|/:id`, `POST /` (multer file), `PUT /:id`, `DELETE /:id`, `POST /:id/share|view|download`, `PUT /reorder` (**shadowed by `/:id` — unreachable**).
- Recording: `POST /` (multer audio), `GET /?leadId=`, `GET /:id`, `POST /:id/reanalyze`, `PATCH /:id/notes`, `DELETE /:id`.

## Database Tables & Relationships
- `SalesContent`: category (11-enum), contentType, fileUrl/externalUrl, visibleToRoles[], counts, embedded `shares[]{leadId,sharedBy,channel,status,viewedAt,messageId}`, tags, order, isFeatured, validity window. 5 tenant indexes.
- `SalesCallRecording`: leadId, recordedBy, audioUrl, status (uploaded/processing/processed/failed), processingProgress, embedded `analysis{transcript,summary,qualityScore,scores{opening,needsDiscovery,productKnowledge,objectionHandling,closingAttempt,professionalism},keyMoments[],improvements[],sentiment,leadInterestLevel,wpm,model}`.

## Events / Notifications / Emails / WhatsApp
- Content share is a **tracking stub** — records a share row + increments count + logs a lead activity, but **never actually sends** a WhatsApp/email (explicit TODO at `salesContentController.ts:249`).

## AI Features (which model, or "None")
Sales Call Recording (OpenAI via axios):
- STT: **`whisper-1`** (`response_format:'verbose_json'`, language en) — `salesCallRecordingService.ts:19`.
- LLM: **`process.env.OPENAI_MODEL || 'gpt-4o-mini'`** (temp 0.3, max 1200, JSON mode) — `:71`. System prompt = "expert sales coach analysing a sales call transcript from an EdTech institution." Transcript truncated to 14000 chars.
- Sales Content: no AI.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| OpenAI Whisper | Call transcription | ~₹0.50 / min audio | `OPENAI_API_KEY` env; throws if unset |
| OpenAI gpt-4o-mini | Coach analysis/scoring | ~₹0.01–0.05 / call | 5-min call ≈ **₹2.5–3** total to transcribe+analyze |
| Local disk | Recording/content storage | Self-hosted | No S3 |

## Validation Rules & Edge Cases
- Content upload: multer 100MB, mime allowlist. Recording: 200MB, broad audio/video allowlist + octet-stream fallback.
- `updateContent` strips tenantId/createdBy/shares/counts from body (anti-tamper).
- Recording marks `failed` if file missing on disk; deletes file on missing leadId/DB error.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 75 | Recording pipeline solid; content share is a stub, file-upload not wired, no queue. |
| Frontend/UI | 55 | Content UI complete but URL-only (no upload/share UI); **recording UI absent**. |
| API | 80 | Full REST surface; reorder route shadowed; recording endpoints lack role guard. |
| Database | 95 | Rich, well-indexed schemas. |
| Automation | 30 | Share doesn't send; processing not durable/queued (in-process fire-and-forget). |
| AI | 85 | Real Whisper+GPT analysis with structured 6-dimension scoring; works. |
| Testing | 0 | No tests. |
| **Overall** | **60** | Recording-analysis is production-grade; content sharing is tracking-only and upload is unwired. |

## Gaps (mark "Not Implemented")
- **Content share sends nothing** — TODO at `salesContentController.ts:249`; whole "share" feature is tracking-only.
- **File upload unwired** — `createContent` uses `req.body.fileUrl` and ignores uploaded `req.file`; files land on disk but never link to the record. No upload widget in UI.
- **`PUT /reorder` unreachable** (declared after `PUT /:id`).
- **Sales Content lacks tenant scoping** on by-id GET/PUT/DELETE/share/view/download → **cross-tenant read/edit/delete leak**.
- **No recording UI page** — backend headless.
- Recording processing is in-process fire-and-forget — server restart mid-transcription strands it in `processing` forever.
- CONTENT_TYPES lists `presentation` not in model enum.
- **Testing:** Not Implemented.

## Technical Debt / Performance / Security / Scalability
- **Security (high):** cross-tenant content access via ID (missing tenantId filter).
- **Correctness:** share promises delivery it never performs; upload path dead.
- **Reliability:** no queue for transcription — lost on restart.

## Suggestions & AI Opportunities
- Add tenantId scoping to all content by-id ops (security). Wire real file upload + actual WhatsApp/email share send. Move transcription to BullMQ (already in stack). Fix reorder route order. Build a recording review UI. Add role guards on recording endpoints.
- **AI:** auto-detect best content to share per lead (RAG over library); AI call-scoring trend dashboards per rep; AI-generated objection-handling snippets from top-scored calls; auto-tag/summarize uploaded content.

## Estimated Dev Effort
- Tenant-scoping + role guards: 2 days. Wire upload + real share send: 3–4 days. Queue transcription: 2 days. Recording UI: 3–4 days. Tests: 2 days. **Total to ~85%: ~2.5 weeks.**
