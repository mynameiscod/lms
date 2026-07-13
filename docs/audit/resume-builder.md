# Resume Builder
**Completion:** 84%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
Lets a student create a resume two ways — upload an existing PDF/DOCX (parsed by AI into structured sections) or build one from scratch in a form-driven editor — then get an honest ATS score, AI auto-improvement, JD-tailoring, live-preview templates, and a public share link. Core of the "get placed" value proposition and the upstream feeder for the Career Profile review.

## Primary Users & Roles
- **STUDENT** — owns one resume (upsert, one per user+tenant); uploads/builds/scores/improves/tailors/shares.
- **TENANT_ADMIN / INSTRUCTOR** — `GET /resume/all` list of tenant resumes with score summary (thin; no drill-down endpoint).
- **Public (unauthenticated)** — read-only shared resume via `/resume/public/:token`.

## Key Files (traced)
- Model: `server/src/models/Resume.ts` (161 lines) — rich embedded schema (sections, score breakdown, design, shareToken, version).
- Routes: `server/src/routes/resumeRoutes.ts` — multer disk upload (10 MB, PDF/DOCX only), public route mounted before auth.
- Controller: `server/src/controllers/resumeController.ts` (207 lines) — getMyResume, uploadResume, saveSections, scoreMyResume, improveMyResume, tailorMyResume, shareMyResume, getPublicResume, getAllResumes.
- Services: `server/src/services/resumeParserService.ts` (PDF/DOCX extraction + OpenAI parse), `server/src/services/resumeScoringService.ts` (score / improve / tailor).
- Client: `client/src/pages/ResumeBuilder/{index.tsx, templates.tsx, RichText.tsx, PublicResumeView.tsx, ResumeBuilder.css}`.

## Dependencies & Connected Modules
- **Career Profile** consumes the latest Resume via `reviewResume()` (careerReviewService reads `Resume.findOne(...).sort({updatedAt:-1})`).
- **aiClients / settingsService** for model selection; **StudentProfile** not used here (used by Career Profile).
- Static uploads served from `/uploads/resumes/` (local disk, not Bunny).

## Entry / Exit Points
- Entry: `/resume` route group. Student page `ResumeBuilder/index.tsx`.
- Exit: public share URL (`/resume/public/:token` → `PublicResumeView.tsx`), and the resume record consumed downstream by Career Profile.

## Database Tables & Relationships
- `resumes` — `userId → User`, `tenantId → Tenant`, unique-in-practice by upsert `{userId, tenantId}` (NOTE: **no DB unique index** enforcing one-per-user; relies on upsert). Indexes: `userId`, `tenantId`, `shareToken` (sparse). Embedded `sections` (contact/summary/experience/education/skills/projects/certifications), `score` (breakdown + suggestions + ATS warnings + keywords), `design`, `version`, `scoredAt`.

## Events / Notifications / Emails / WhatsApp
- **None.** No notifications, emails, or WhatsApp on any resume action.

## AI Features
| Feature | Provider / Model | Purpose |
|---|---|---|
| Parse uploaded resume text → JSON sections | **OpenAI `gpt-4o-mini`** (hardcoded, temp 0.1) | Structuring raw PDF/DOCX text |
| ATS score | **Claude (`INTERVIEW_AI_MODEL`, default `claude-sonnet-4-6`)** first, OpenAI (`OPENAI_MODEL`, default gpt-4o-mini) fallback | Honest 0-100 breakdown; total re-summed server-side so it can't be anchored/inflated |
| AI auto-improve (rewrite summary/bullets/projects/skills) | Same Claude→OpenAI | ATS-optimised rewrite, facts preserved |
| Tailor to job description | Same Claude→OpenAI | JD match %, matched/missing keywords, tailored bullets |

Note: parse step is OpenAI-only (no Claude fallback) and will fail hard if only an Anthropic key is configured.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| OpenAI GPT-4o-mini | Resume parse; scoring/improve fallback | ~₹12–15 / 1M input, ~₹50 / 1M output tokens | Parse ~6k-char prompt ≈ <₹0.5/resume |
| Anthropic Claude Sonnet 4.x | Scoring, improve, tailor (primary) | ~₹250 / 1M input, ~₹1,250 / 1M output | Improve uses up to 4096 out tokens ≈ ₹3–5/run |
| `pdf-parse` (npm) | PDF text extraction | Free (OSS) | v1 direct-function guard in code |
| `mammoth` (npm) | DOCX/DOC text extraction | Free (OSS) | |
| `multer` | Local disk upload | Free | Stored to `/uploads/resumes` (local FS, no CDN) |

## Validation Rules & Edge Cases
- Upload: 10 MB limit, MIME allowlist (PDF/DOCX/DOC); empty-text extraction → 400 "Try a text-based PDF" (scanned/image PDFs unsupported — no OCR).
- Score total clamped to sum of breakdown (max 100); JSON parse failure → zero-score fallback.
- Tailor: rejects JD < 30 chars.
- Improve: round-trips Mongoose subdoc to plain object (documented past bug where certifications dropped).
- Template validated against enum on save; design object passed through unvalidated.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 90 | All flows implemented, robust AI fallbacks, anti-anchoring score logic |
| Frontend/UI | 85 | Full builder, 8-template gallery + design panel (font/accent/spacing/align), rich-text editor, live score panel, public view, share, upload modal, tips checklist; PDF download via client render |
| API | 85 | Complete CRUD-ish; admin list is thin (no per-resume admin view, no delete/version history endpoints) |
| Database | 85 | Solid schema + versioning field, but no unique index; version increments but no history retained |
| Automation | 0 | No reminders/notifications/cron |
| AI | 90 | Parse + score + improve + tailor; parse lacks Claude fallback |
| Testing | 0 | No test file |
| **Overall** | **84** | Feature-rich, production-used; gaps in admin depth, automation, storage durability, tests |

## Gaps (Not Implemented)
- **Features:** No OCR for scanned PDFs; no true PDF export endpoint (server-side render); no version history retrieval despite `version` field; no multiple/named resumes per student.
- **APIs:** No admin drill-down/delete; no un-share/revoke token endpoint.
- **Validation:** `design` object not validated/sanitised; no rate limit on AI-heavy endpoints (score/improve/tailor).
- **Automation/Notifications/Reports:** None.
- **Dashboard widgets:** None (only raw admin list).
- **Analytics:** No tracking of score-over-time, improvement uplift, or share views.
- **Security:** Uploaded files on local disk under web-served `/uploads` (public path); share token is unguessable but never expires/revocable.
- **UX:** Loading/error states present in page; empty-state completeness not verified. No autosave indicator confirmed.
- **Permissions:** `getAllResumes` guarded only by auth+tenant, not a role guard — any authenticated user in tenant could hit `/resume/all` (needs role check).
- **Audit logs / Mobile:** None / not verified.

## Technical Debt / Performance / Security / Scalability
- **Security:** `/resume/all` lacks explicit role guard (relies on client hiding it) — privilege gap.
- Local-disk resume files are not durable across blue/green deploys and are publicly path-addressable.
- OpenAI model hardcoded in parser (bypasses Platform Settings).
- Synchronous AI calls block the request (improve can take many seconds) — no queue/async job.

## Suggestions & AI Opportunities
- Add role guard to admin list + a proper admin analytics view (avg score by batch, improvement uplift).
- Move uploads to Bunny (already used elsewhere); add token revoke + expiry.
- Server-side PDF render for pixel-perfect export/share.
- AI opportunity: JD-match auto-apply that pushes tailored bullets straight into the saved resume; "resume vs peers in batch" benchmark; keyword coverage heatmap.

## Estimated Dev Effort
- Security + admin analytics + Bunny migration: ~4–5 dev-days.
- PDF render service + version history: ~3 dev-days.
- OCR + async AI queue: ~3 dev-days.
- Tests: ~2 dev-days. **Total to "95%": ~2.5 weeks.**
