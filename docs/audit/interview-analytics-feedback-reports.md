# Interview Analytics & Feedback Reports
**Completion:** 76%  |  **Priority:** P3  |  **Business Impact:** Medium

## Purpose & Business Goal
Two consumers of the attempt data: (1) **Admin Analytics** — tenant-wide dashboard (attempts, completion rate, avg score, pass rate, section-type averages, top/bottom performers, 30-day trends, AI cost rollup); (2) **Student Feedback Report** — the rich per-attempt readiness report (gauge, radar of category scores, section drill-down, strengths/weaknesses, recommended practice, recording playback). Business goal: turn raw attempt scoring into decision-grade insight for admins and motivating, actionable feedback for students.

## Primary Users & Roles
- **TENANT_ADMIN / INSTRUCTOR** — admin analytics (`manage_interview_templates`); view any attempt report (`evaluate_interviews`).
- **STUDENT** — own analytics (`getStudentAnalytics`) + own feedback report (`attempt_interviews`, own attempts only).

## Key Files (traced)
- `server/src/services/interviewTemplateService.ts` — `getAdminAnalytics` (L1118, counts + section averages + top/bottom performers + trends + AI cost rollup L1222), `getStudentAnalytics` (L1247, best/latest/readiness/sectionPerformance/weakAreas/upcoming/missed), `getAttemptReport` (L1078, enriches with correct answers/model answer/expected points, students only see published).
- `server/src/controllers/interviewTemplateController.ts` — `getAdminAnalytics` (L714), `getStudentAnalytics` (L724), `getAttemptReport` (L675, strips AI cost fields for students), `getAttemptsByStudent` (L704).
- `client/src/pages/InterviewAnalytics/index.tsx` (186 lines) — admin dashboard.
- `client/src/pages/InterviewFeedbackReport/index.tsx` (256 lines) — per-attempt report (gauge/radar/section drill-down/recording modal).

## Dependencies & Connected Modules
- **AI Virtual Interview** — sole data source (InterviewAttempt scoring + category scores + AI cost).
- **Assignments** — student analytics counts assigned/completed/pending/missed.
- **Bunny Stream** — report embeds recording playback iframe.

## Entry / Exit Points
- Entry: `GET /interview-module/analytics/admin`, `/student/analytics`, `/student/attempts/:id/report`, `/attempts/:id/report` (admin), `/students/:id/attempts`.
- Exit: terminal (dashboards/reports); report offers download/share (client-side) + recording modal.

## Database Tables & Relationships
- Reads `interviewattempts` (aggregations), `interviewassignments`, `interviewtemplates`. No new tables.

## Events / Notifications / Emails / WhatsApp
- None. Pull-only views.

## AI Features (which model)
- No direct AI here — consumes AI-produced fields (category scores, readiness, recommended practice) generated upstream by Claude in the attempt pipeline. AI **cost** is surfaced (total + avg per interview) in admin analytics.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| Bunny Stream | Report recording playback (iframe) | delivery ≈ ₹0.85/GB (approx $0.01/GB) | Playback only; recording captured in attempt module |
| (Claude cost surfaced) | Displays accumulated AI spend | — | Reporting of cost, not incurring it |

## Validation Rules & Edge Cases
- Report only returned to students when attempt is `published`/`evaluated`; ownership enforced.
- AI cost fields (`aiCostUsd`/tokens) stripped from the student report payload.
- Admin analytics computes completion rate, top/bottom 10, 30-day trend via aggregation.
- Edge gaps: **admin analytics filters (template, date-range) are defined in the FE but never sent to the API** — data is always unfiltered (confirmed FE bug); no real charting lib (manual CSS-width bars/SVG).

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 88 | Rich admin + student aggregations, cost rollup, report enrichment |
| Frontend/UI | 76 | Report page is excellent (88); analytics dashboard is 65 due to broken filters + no chart lib |
| API | 80 | Endpoints present; admin analytics ignores filter params |
| Database | 90 | Aggregations well-formed (ObjectId cast handled) |
| Automation | N/A | Pull-based by design |
| AI | N/A | Consumes AI output; no AI logic here |
| Testing | 5 | No tests |
| **Overall** | **76** | Report is production-grade; analytics dashboard needs filter wiring + real charts |

## Gaps
- **Analytics — Broken:** FE filter controls (template, date range) not passed to `getAdminAnalytics` — always unfiltered. Backend also doesn't accept filter args.
- **Reports — Not Implemented:** report "Download"/"Share" are client-side only; no server-side PDF export of the interview report (a `candidateProfilePdf` service exists for other flows but not wired here).
- **Dashboard widgets — Not Implemented:** no per-template funnel, no cohort comparison, no time-to-improvement metric; scheduled/manual-interview data is NOT in these analytics (only AI attempts).
- **Charting:** manual CSS/SVG bars — no library; limited interactivity.
- **AI — Opportunity:** no AI-written "cohort insights" narrative for admins.
- **Empty states:** analytics has only a top-level empty state, not per-section.
- **Audit logs / Mobile:** report mostly responsive; analytics untested on mobile.

## Technical Debt / Performance / Security / Scalability
- Admin analytics runs several aggregations per request with no caching — fine now, but add caching/materialized rollups as attempt volume grows.
- Filters being ignored is a correctness bug that could mislead admins.
- Analytics scope excludes the human/scheduled track — split reporting is confusing.

## Suggestions & AI Opportunities
- Wire template + date-range filters through to the aggregation (both FE and BE).
- Add server-side PDF export of the feedback report.
- Merge scheduled/manual-interview outcomes into a unified interview analytics view.
- AI: auto-generate a weekly cohort insight summary for admins; AI study-plan from a student's weak areas.
- Adopt a lightweight chart lib or keep SVG but add tooltips/interactivity.

## Estimated Dev Effort
- Fix filter wiring (FE+BE): ~1 day. PDF export: ~1.5 days. Unified analytics (AI+manual): ~2 days. AI cohort insights: ~1.5 days. Caching + chart polish: ~1.5 days. Tests: ~1 day. **Total ≈ 8–9 dev-days.**
