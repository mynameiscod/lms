# Dashboard (Student & Admin)
**Completion:** 70%  |  **Priority:** P2  |  **Business Impact:** High

## Purpose & Business Goal
The landing surface that orients each role. **Admin overview** shows org KPIs (students, courses, batches, revenue with MoM %, fee donut, placements, enrollment trend, top courses, batch status, reminders, recent-activity feed, bottom metrics). **Student dashboard** shows today's plan, upcoming assignments/quizzes/snippets, recent activity, and headline stats. A third **CareerPilot dashboard** focuses funnel students on their track/mock-interviews/portfolio. First impression + daily driver for engagement and retention.

## Primary Users & Roles
- **TENANT_ADMIN / STAFF / INSTRUCTOR** — AdminOverview.
- **STUDENT** — StudentDashboard, or CareerPilotDashboard if funnel-originated.
- **SUPER_ADMIN** — admin views (tenant-scoped).

## Key Files (traced — real paths)
- Routes: `server/src/routes/dashboardRoutes.ts` (21) — `/admin-stats`, `/admin-overview`, `/student`.
- Controller: `server/src/controllers/dashboardController.ts` (515) — `getAdminStats`, `getAdminOverview`, `getStudentDashboard`.
- Client: `client/src/pages/Dashboard/index.tsx` (379, role router), `AdminOverview.tsx` (245), `StudentDashboard.tsx` (260), `CareerPilotDashboard.tsx`.

## Dependencies & Connected Modules
- Reads across the platform: User, Course, Batch, Fee, PlacementDrive, Lead, AssessmentSubmission, QuizAttempt, Submission, Attendance, Certificate, ScheduledInterview, CodeSnippetAssessment, Enrollment/CurriculumEnrollment day plans.
- Student "Today's Plan" pulls from `enrollmentPlanApi.getDayPlan` (Enrollment module).

## Entry / Exit Points
- `GET /dashboard/admin-stats`, `GET /dashboard/admin-overview`, `GET /dashboard/student`. All auth+tenant middleware; **no roleGuard** — any authenticated tenant user can hit `/admin-overview` (data-exposure risk).
- Client role-routes in `Dashboard/index.tsx`: non-student or admin-permissioned → AdminOverview; CareerPilot student → CareerPilotDashboard; else StudentDashboard.

## Database Tables & Relationships
- No dashboard-owned tables; it's a read/aggregation layer. Heavy use of `aggregate` (fee unwind, enrollment-by-day grouping) and multiple parallel `countDocuments`/`find` queries.

## Events / Notifications / Emails / WhatsApp
- Surfaces "reminders" (overdue fees, ending batches, placement drives, upcoming interviews) as read-only widgets — no dispatch.

## AI Features (which model, or "None")
None. (CareerPilotDashboard links to AI features owned by other modules but the dashboard itself computes no AI.)

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| None | Pure aggregation over existing collections | ₹0 | Charts client-side (recharts) |

## Validation Rules & Edge Cases
- `getAdminOverview` guards on tenant/auth only (401 if missing) — no permission check.
- Student dashboard assumes a single active enrollment for the course/progress card.
- **Edge/gaps:** no caching — every load recomputes all aggregations (expensive at scale, e.g., fee unwind, 30-day enrollment series, 5-query recent-activity feed with a per-fee user lookup N+1). Optional widgets (college snapshot, lead follow-ups) fail silently. No error toast on failed fetches; AdminOverview has page-level loading only, no empty states.

## Completion Breakdown
| Dimension | % | Reasoning (from actual code) |
| Backend | 82 | Rich 515-line controller assembling many real metrics; N+1 + no caching |
| Frontend/UI | 68 | Three dashboards render real data + charts; limited error/empty states; AdminOverview polish partial |
| API | 78 | Three clean endpoints; missing role guards + pagination on activity |
| Database | 78 | Uses indexes on underlying collections; some heavy aggregations unoptimized |
| Automation | 20 | Reminder widgets are display-only; no scheduled refresh/caching |
| AI | 0 | None |
| Testing | 5 | No dashboard tests |
| **Overall** | **70** | Genuinely useful, data-backed dashboards; needs RBAC, caching, and error/empty-state polish |

## Gaps (mark "Not Implemented" where absent)
- **Features:** Predictive/engagement analytics (funnel, retention, churn) — Not Implemented. Learning streak/velocity on student dashboard — Not Implemented (data exists).
- **APIs:** Pagination on recent-activity — Not Implemented.
- **Validation:** Student "Today's Plan" error state — Not Implemented (silent "No plan").
- **Automation:** Caching / scheduled precompute — Not Implemented.
- **Notifications:** Reminders are display-only, no dispatch.
- **Reports:** No CSV/PDF export of overview.
- **Dashboard widgets:** Cohort retention, instructor effectiveness, content-completion funnel — Not Implemented.
- **AI:** None.
- **Security:** roleGuard on `/admin-overview` + `/admin-stats` — **Not Implemented (info-disclosure risk)**.
- **UX:** Skeleton loaders, per-widget empty/error states — Not Implemented.
- **Audit logs:** N/A.

## Technical Debt / Performance / Security / Scalability
- **Security:** missing role guard on admin dashboards is the top issue — a STUDENT token could fetch org revenue/placements JSON.
- **Performance:** uncached heavy aggregations recomputed on every load; N+1 on fee-payment user lookups.
- Duplicated metric logic between admin-stats and admin-overview.

## Suggestions & AI Opportunities
- Add `roleGuard(['view_dashboard'|'manage_tenant'])` to admin routes.
- Cache admin-overview (short TTL / precompute nightly) and replace N+1 with `$lookup`.
- Add student streak/velocity + "focus next" recommendation.
- AI opportunity: natural-language "ask your dashboard" (Claude over the aggregated metrics); AI-generated weekly admin summary; at-risk-student widget.

## Estimated Dev Effort
- RBAC + error/empty states: **1 week**.
- Caching + aggregation optimization: **1 week**.
- New analytics widgets: **1.5–2 weeks**.
