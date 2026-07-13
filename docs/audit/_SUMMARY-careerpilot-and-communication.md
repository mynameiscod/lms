# CareerPilot & Communication Labs — Audit Summary

Auditor domain: CareerPilot & Communication Labs (8 modules). Repo: `d:\Simple_CB_LMS\Codebegun\lms-saas`.
Method: real code traced (models, routes, controllers, services, jobs, client pages, tests). Percentages reasoned from implementation evidence; prices in ₹ INR.

### SUMMARY

| Module | Overall% | BE% | FE% | API% | DB% | Auto% | AI% | Priority | Impact | Top-3 Gaps | Third-party + Cost (₹) | 1-line status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| AI Communication Lab | **90** | 95 | 92 | 95 | 95 | 70 | 90 | P1 | High | Video/body-language analysis (null); in-app-only reminders (no email/WhatsApp); synchronous submit (20–40s) | Whisper (~₹0.5/min) + Claude Sonnet (~₹2–4/eval) + Bunny (~₹0.85/GB/mo); ~₹4–6/student/day | Production-grade daily-speaking product; most complete module — polish video AI + async + multi-channel nudges |
| Resume Builder | **84** | 90 | 85 | 85 | 85 | 0 | 90 | P1 | High | `/resume/all` admin route lacks role guard; local-disk uploads (non-durable, public path); no automation/notifications | OpenAI gpt-4o-mini (parse) + Claude Sonnet (score/improve/tailor); pdf-parse/mammoth free; ~₹3–5/improve | Feature-rich (parse/score/improve/tailor/share/8-templates); harden security + storage + tests |
| Career Profile / CareerPilot review | **80** | 88 | 82 | 85 | 85 | 5 | 90 | P1 | High | Admin routes lack explicit role guard; no submit/complete notifications; LinkedIn is manual-paste (no API) | GitHub REST (free) + Claude Sonnet (~₹8–15/full review); LinkedIn ₹0 | 3-pillar AI review + trainer workflow, deployed; add role guards, notifications, LinkedIn OAuth |
| Speaking Practice (legacy) | **80** | 88 | 85 | 85 | 85 | 75 | 85 | P4 | Low | Superseded by Communication Lab; no server-side duration enforcement/cascade; eval not metered | Whisper (~₹0.5/min) + Claude Sonnet (~₹1–2/sub) + Bunny | Complete but deprecated; extract shared `transcribeFile` then retire |
| Job Tracker | **78** | 90 | 85 | 85 | 85 | 0 | 0 | P2 | Medium | No follow-up reminders (despite `nextActionAt`); no admin/analytics view; no filters/search/export | None (₹0) | Solid single-user Kanban; wire reminders + funnel analytics |
| AI Mentor | **72** | 80 | 80 | 75 | 80 | 0 | 80 | P2 | Medium-High | No usage metering/rate-limit/moderation; no streaming; wrong settings key (`ASSESSMENT_ROADMAP_MODEL`) | Claude Sonnet (~₹1–3/reply, unmetered) / gpt-4o-mini fallback | Genuinely grounded coaching chat; add safety/metering/streaming |
| Resource Library | **85** | 90 | 85 | 88 | 88 | 10 | 0 | P2 | Medium | No request-lifecycle notifications; no file MIME validation; approved access never expires | Bunny (~₹0.85/GB/mo, up to ~1 GB/file) | Robust audited file library; add notifications + MIME checks + access expiry |
| Mentoring Requests (& Alumni Referrals) | **68** | 78 | 70 | 80 | 65 | 20 | 0 | P3 | Medium | tenantId type mismatch (string vs ObjectId across models); no mentoring-lifecycle notifications; no cascade on alumni delete | None (₹0) | Functional networking (wired in AlumniDirectory/Management); fix tenantId, close notification loop |

### Cross-cutting findings
- **Role-guard gap (P1):** Resume Builder (`/resume/all`) and Career Profile admin routes rely only on `auth + tenant` middleware, not `roleGuard` — unlike Communication Lab / Resource / Speaking which do guard. Verify/close this privilege gap.
- **AI stack:** Anthropic Claude (`INTERVIEW_AI_MODEL`, default `claude-sonnet-4-6`) is primary across CareerPilot, OpenAI `gpt-4o-mini` the fallback; OpenAI Whisper (`whisper-1`) is STT (hardcoded); resume parse is OpenAI-only (no Claude fallback). AI Mentor inconsistently uses `ASSESSMENT_ROADMAP_MODEL`.
- **Cost metering:** Communication Lab + Whisper record usage via `aiGateway`; AI Mentor and Speaking eval do NOT — AI spend partially invisible.
- **Notifications:** Only in-app (`notificationService`); no email/WhatsApp anywhere in this domain. Several workflows (Career review complete, Resource request review, mentoring accept/decline) send NO notification at all.
- **Testing:** Only `communicationLab.test.ts` exists (unit tests for metrics/template/achievements). All 7 other modules have zero tests.
- **Storage:** Bunny for recordings/resources (durable, streamed); Resume uploads are on local disk under a web-served path (non-durable across blue/green deploys).
- **All modules are wired** in `routes/index.ts` (or alumniRoutes) — no orphaned models.
