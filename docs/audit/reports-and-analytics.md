# Reports & Analytics
**Completion:** 69%  |  **Priority:** P2  |  **Business Impact:** High

## Purpose & Business Goal
Turn raw activity into decisions: per-student 360 reports (attendance/quizzes/assignments/fees/interviews/exams), quiz analytics (difficulty, pass rate, rankings, trends), and dashboards across department, cohort, placement, interview, attendance, assignment, and lead funnels. This is how admins/instructors judge learning outcomes, ROI, and where to intervene.

## Primary Users & Roles
- **TENANT_ADMIN / INSTRUCTOR / STAFF** (`manage_tenant_users`/`manage_tenant_courses`) — student/dept/quiz reports, dashboards.
- **STUDENT** — personal dashboard.

## Key Files (traced)
- Services: `server/src/services/studentReportService.ts` (compiles attendance/quiz/assignment/fee/interview/exam), `quizAnalyticsService.ts` (avg/median/stddev/time, per-question, rankings, trends).
- Routes: `server/src/routes/studentReportRoutes.ts` (search/summary/:studentId), `dashboardRoutes.ts` (admin-stats/admin-overview/student), quiz analytics (`/quiz/:id/analytics`).
- PDF: `pdfkit` used in `placement/certificateController.ts`, `services/candidateProfilePdf.ts` (certificates/one-pagers, not general report export).
- Client: `StudentReports/`, `DeptReports/`, `QuizReports/`, `AttendanceReports/`, `AssignmentReports/`, `InterviewAnalytics/`, `PlacementAnalytics/`, `Dashboard/`, `CohortProgress/`, `LeadAnalytics/`, `AiSpend/`.

## Dependencies & Connected Modules
- Reads across nearly every domain model (User, Attendance, QuizAttempt, Submission, Fee, Interview, Exam, PlacementDrive/User.placement, Lead, AiUsage).
- **AiSpend** is an analytics surface owned by AI Infrastructure but rendered here as a dashboard.

## Entry / Exit Points
- Entry: `GET /student-reports/{search,summary,:studentId}`, `GET /dashboard/{admin-stats,admin-overview,student}`, `GET /quiz/:id/analytics`, plus per-domain analytics endpoints (placement overview/analytics, lead analytics, ai-usage summary).
- Exit: aggregated JSON consumed by chart.js/recharts dashboards. Limited PDF (certificates only).

## Database Tables & Relationships
- No dedicated report/warehouse tables — reports are computed on-the-fly from source collections via `find` + in-memory aggregation (some `$group` pipelines, e.g. placementOverview, quiz stats).

## Events / Notifications / Emails / WhatsApp
- **Daily-summary email** (`dailySummaryCron`, 8 PM) is the main automated report-out; can route via Brevo.
- No scheduled per-report email delivery otherwise.

## AI Features
- None in the reporting layer itself (AiSpend reports AI cost but doesn't use AI). Opportunity area.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| pdfkit | Certificate/one-pager PDFs | ₹0 (lib) | Not general report export |
| SMTP/Brevo | Daily summary email | ~₹0 | See email/cost rollup |
| chart.js / recharts | Client charts | ₹0 | Client libs |

## Validation Rules & Edge Cases
- Report routes guarded by `manage_tenant_users`/`manage_tenant_courses`; student dashboard is self-scoped.
- Aggregations largely in-memory (fetch then compute) — correct but not optimized for very large cohorts.
- Recent-records lists capped (e.g., last 10/30) to bound payloads.

## Completion Breakdown
| Dimension | % | Reasoning |
| Backend | 75 | Student report + quiz analytics services solid; many domain dashboards backed. Missing: cohort comparison, benchmarking, predictive, caching. |
| Frontend/UI | 60 | 10+ report/dashboard pages exist with charts. Depth per page varies; many lack export/drill-down/advanced filters. |
| API | 70 | Report + dashboard + per-domain analytics endpoints. Missing: CSV/Excel export, scheduled-report API, PDF report endpoints. |
| Database | 90 | Source models support queries and are indexed. Missing: materialized/cached rollups for scale. |
| Automation | 40 | Daily-summary email cron only. Missing: scheduled report delivery, anomaly alerts. |
| AI | 0 | None (no summarization/prediction). |
| Testing | 10 | No report-service tests. |
| **Overall** | **69** | Broad on-demand reporting/dashboards; gaps in export, scheduling, caching, and AI insight. |

## Gaps (mark "Not Implemented")
- **Export:** CSV/Excel/PDF export of reports (PDF is certificate-only) — Not Implemented.
- **Scheduling:** scheduled/emailed periodic reports beyond the single daily summary — Not Implemented.
- **Comparison:** cross-cohort/batch comparison, role benchmarks — Not Implemented.
- **Alerts:** anomaly detection (e.g., attendance drop) — Not Implemented.
- **Performance:** materialized rollups/caching for large batches — Not Implemented.
- **AI:** natural-language report summaries, at-risk/churn prediction, placement-probability — Not Implemented.
- **Testing:** none.

## Technical Debt / Performance / Security / Scalability
- Fetch-then-aggregate-in-memory patterns will slow for 1,000+ student batches; push to aggregation pipelines / cached rollups.
- No report caching means repeated heavy queries on dashboard loads.

## Suggestions & AI Opportunities
- Add CSV/PDF export + a scheduled-report emailer; cache expensive rollups.
- AI: "explain this cohort's dip in one paragraph", predict at-risk students and placement probability, auto-generate weekly admin digest narratives from the metrics.

## Estimated Dev Effort
~8-12 dev-days: export (CSV/PDF) (2-3d), scheduled reports + caching (3-4d), cohort comparison + anomaly alerts (2-3d), AI summaries (2d).
