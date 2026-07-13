# Interviews Domain — Audit Summary
_CodeBegun LMS · Interviews domain · audited from real code (server/src + client/src)_

The Interviews domain spans **two tracks** — **AI Virtual** (Claude-graded structured + live conversational) and **Manual/Scheduled** (human interviewer) — plus supporting **Templates**, **Question Bank**, **Assignments**, and **Analytics/Reports**. Backend is the strongest layer (robust scoring lifecycle, real Claude brain, deterministic fallbacks, cost tracking). The recurring weaknesses across every module are: **no automated notifications on key events**, **zero test coverage**, **dormant automation flags/crons**, and **mobile/polish gaps** on the frontend.

### SUMMARY

| Module | Overall% | BE% | FE% | API% | DB% | Auto% | AI% | Priority | Impact | Top-3 Gaps | Third-party + Cost (₹) | 1-line Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Interview Templates** | 88 | 95 | 82 | 95 | 95 | 60 | N/A | P2 | High | No auto-expire cron · no template-usage analytics · avatar on local disk (not CDN) | Multer/local disk (₹0) | Mature blueprint layer; needs status-transition automation + tests |
| **Interview Question Bank** (modern, template-driving) | 84 | 92 | 82 | 95 | 95 | 70 | 85 | P2 | High | Follow-up triggers dormant · no dedupe · naming collision w/ legacy model | Claude gen (~₹250/₹1250 per 1M tok) | Strong AI-gradeable authoring; follow-up feature unused |
| **Interview Legacy Q&A** (chapter study bank) | 90 | 95 | 82 | 95 | 95 | N/A | N/A | P4 | Medium | No pagination · no SRS · naming collision | None (₹0) | Finished low-complexity study feature, isolated from AI pipeline |
| **Interview Assignments** | 82 | 90 | 82 | 92 | 95 | 55 | N/A | P2 | High | No expiry auto-flip · no email/WhatsApp reminders · dormant notify flags | In-app notify only (₹0) | Distribution solid; automation half-built |
| **AI Virtual Interview** | 80 | 90 | 80 | 92 | 95 | 70 | 85 | **P1** | High | No result-ready notification · synchronous mid-interview grading latency · stubbed toolbar + no live-error recovery | Claude ₹3–20/interview · ElevenLabs ₹1–2 · D-ID ₹25–35 (opt) · Bunny ₹0.85/GB | Flagship, production-shaped; polish + notifications + tests remain |
| **Scheduled / Manual Interviews** | 85 | 92 | 84 | 90 | 92 | 55 | N/A | P2 | High | Weak route RBAC (auth-only) · no release/reminder notifications · orphaned legacy `Interview` model | Hostinger SMTP (₹0 marginal) | Strong human track; absent→0 + red-alert work; notification + RBAC gaps |
| **Interview Analytics & Feedback Reports** | 76 | 88 | 76 | 80 | 90 | N/A | N/A | P3 | Medium | Admin analytics filters ignored (bug) · no server PDF export · manual/AI tracks not unified | Bunny playback ₹0.85/GB | Report page excellent; analytics dashboard needs filter wiring |

### Domain-wide averages
- **Backend ≈ 92%** · **Frontend ≈ 81%** · **API ≈ 91%** · **Database ≈ 94%** · **Automation ≈ 60%** · **AI (where applicable) ≈ 85%** · **Testing ≈ 5%**
- **Weighted domain completion ≈ 83%.**

### Cross-cutting themes (fix once, benefits all modules)
1. **Notifications engine gaps** — no email/WhatsApp/in-app on: result-ready, feedback-released, assignment-expiring. Several `notified*` flags exist but no job sets them. Build one escalation/notify cron reusing the existing `interviewReminderCron` tick.
2. **Zero automated tests** across the entire domain — scoring/grading logic (the business-critical part) is untested.
3. **Dormant automation** — assignment expiry auto-flip, template status transitions, and pre-slot reminders for the human track are all unimplemented despite schema/index intent.
4. **RBAC inconsistency** — the AI track uses granular interview permissions; the scheduled/manual track is only auth+tenant guarded (security gap).
5. **Naming/model debt** — three overlapping models (`InterviewQuestion` legacy vs `InterviewQuestionBank` modern; orphaned `Interview`) create real confusion; the FE page names compound it.
6. **Mobile + FE polish** — stubbed rich-text toolbar, broken analytics filters, no live-interview error recovery, untested small-screen layouts.
7. **AI spend governance** — per-attempt cost is tracked but there is no per-tenant budget cap or alerting.

### Top priorities (by impact/effort)
- **P1 quick wins:** result-ready notifications (~1d); wire analytics filters (~1d); make/remove stubbed toolbar (~1d).
- **P1 medium:** defer/queue AI grading to remove mid-interview latency (~2–3d); live-interview error recovery + mobile pass (~2–3d).
- **P2:** unified notify/expiry cron + human-track RBAC (~2–3d); follow-up-trigger wiring for adaptive interviews (~2d).
- **Cross-cutting:** first test suite for scoring/grading (~2–3d); AI budget caps (~1d); model consolidation/cleanup (~1d).

### Module docs
- `interview-templates.md`
- `interview-question-bank.md`
- `interview-legacy-qa.md`
- `interview-assignments.md`
- `ai-virtual-interview.md`
- `scheduled-manual-interviews.md`
- `interview-analytics-feedback-reports.md`
