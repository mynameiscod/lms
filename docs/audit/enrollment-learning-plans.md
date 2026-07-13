# Enrollment & Learning Plans
**Completion:** 85%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
The engine that turns a curriculum into a **day-by-day student journey**. `CurriculumEnrollment` binds a student to a curriculum (individually or via a batch cohort), tracks day/item completion, XP, streaks, and daily goals. `BatchOffering` instantiates a curriculum for a cohort (shared class start date, holidays, per-batch day overrides) without mutating the shared `DayPlan` template. The module powers the student "My Learning Plan", the sell-funnel "Journey" page (with a free 2-day preview + Razorpay paywall), and the unified "My Tasks" feed. This is the core monetizable learning experience.

## Primary Users & Roles
- **STUDENT** — views enrollments, day plans, journey, completes items, tracks goals, raises concerns, pays to unlock.
- **TENANT_ADMIN / INSTRUCTOR / STAFF** — enroll students/batches, create BatchOfferings, edit per-day overrides, monitor cohort progress.
- **SUPER_ADMIN** — cross-tenant.

## Key Files (traced — real paths)
- Models: `server/src/models/CurriculumEnrollment.ts` (109, primary), `Enrollment.ts` (51, legacy course-level), `BatchOffering.ts` (95), `DayPlan.ts` (81), `WeekConfig.ts` (35), `WeekendPlan.ts` (49). Note: no standalone "EnrollmentPlan" model — the plan is `CurriculumEnrollment` + `DayPlan` + `BatchOffering`.
- Routes: `server/src/routes/enrollmentPlanRoutes.ts` (`/enrollment-plans`), `batchOfferingRoutes.ts` (`/batch-offerings`), `enrollmentRoutes.ts` (legacy)
- Controllers: `server/src/controllers/enrollmentPlanController.ts` (999), `batchOfferingController.ts` (207), `learningExperienceController.ts` (286)
- Services: `server/src/services/enrollmentService.ts` (53), `razorpayService.ts` (103), `assessmentEnrollmentService.ts` (`unlockCandidatePlans`), `utils/planSchedule.ts`, `utils/planMilestones.ts`
- Payment: `server/src/controllers/paymentController.ts`, `routes/paymentRoutes.ts`
- Concern (raise-a-concern): `server/src/routes/concernRoutes.ts`, `models/Concern.ts`
- Client: `client/src/pages/EnrollmentPlans/index.tsx` (535), `MyLearningPlan/index.tsx` (165), `Journey.tsx` (179), `DayView.tsx` (792), `LearningPlanPro.tsx` (547), `InteractiveActivityViewer.tsx`, `MyTasks/index.tsx` (160), `BatchOfferings/index.tsx` (315), `client/src/api/enrollmentPlanApi.ts` (244)

## Dependencies & Connected Modules
- **Curriculum & Content Library** (LearningCurriculum, DayPlan, LearningContentLibrary) — the plan source.
- **Batch Management** — cohort anchoring + holidays + weeklyOffDays via `resolveSchedule`.
- **Quiz / Assignment / CodeSnippet / InterviewTemplate** — day module items; statuses resolved via `resolveModuleStatuses`.
- **Student Progress & Personalization** — lazy AI day gen (`ensureDayContentGenerated`) fires from `getStudentDayPlan`.
- **Razorpay** (paywall unlock) + **assessmentEnrollmentService.unlockCandidatePlans**.
- **LearningExtras** (StudentNote/Bookmark/TopicDiscussion) + AI study assistant.

## Entry / Exit Points
Student: `GET /enrollment-plans/my`, `/my-tasks`, `/:id/journey`, `/:id/day/:day`, `PATCH /:id/complete-item`, `GET /:id/summary`, `POST /:id/heartbeat`, `PUT /:id/goals`, notes/bookmarks/discussion CRUD, `POST /:id/assistant` (AI), `GET /:id/search`.
Admin: `GET /enrollment-plans/`, `POST /student`, `POST /batch`, `GET /curriculum/:curriculumId[/stats]`, `GET /:id`, `PATCH /:id/status`, `PUT /:id/settings`.
BatchOffering: `GET/POST /batch-offerings`, `GET/PUT/DELETE /:id`, `GET /:id/progress`, `GET/PUT /:id/day/:day`.
Payment: `POST /payments/order`, `POST /payments/verify`, webhook. All routes: auth+tenant middleware (no explicit route-level roleGuard).

## Database Tables & Relationships
- `curriculumenrollments` — unique `(curriculumId, studentId)`; `(tenantId,status)`, `(tenantId,studentId)`, `(tenantId,batchId)`. Holds completedDays/completedItems, xp, timeSpentSeconds, activityDates, goalTargets, previewOnly/previewDays.
- `batchofferings` — unique `(tenantId,curriculumId,batchId)`; dayOverrides (addedItems/removedItemIds).
- `dayplans` — unique `(curriculumId,dayNumber)`.
- `weekendplans`, `weekconfigs` — weekly/weekend structures.

## Events / Notifications / Emails / WhatsApp
- **Due-reminder cron** dedupe field `lastReminderOn` exists on the model; a due-reminder job paces reminders (referenced in MEMORY email pacing work). Enrollment/completion/unlock notification dispatch is **thin/not fully wired** in this module.
- Razorpay webhook → unlock (server-side), no receipt email in this path.
- Concern raise → mentor list (via concernRoutes), no push/WhatsApp confirmed.

## AI Features (which model, or "None")
- **Study Assistant** (`POST /:id/assistant`, learningExperienceController) — Claude (Anthropic via aiClients).
- **Lazy day content generation** on day open — Claude Sonnet 4.6 (see Progress/Personalization module).
- Milestones (mock-interview every ~3 weeks, mid/final project) computed by `utils/planMilestones.ts` (rule-based, not AI).

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| Razorpay | Learning-plan paywall unlock (preview → full) | 2% + GST per transaction (standard Razorpay MDR) | `razorpayService` (createOrder/verifyPaymentSignature/verifyWebhookSignature); default unlock price via `getPriceInr` (per-tenant setting, ~₹4999 default); wired end-to-end in `paymentController` → `unlockCandidatePlans` |
| Anthropic Claude | Study assistant + lazy day gen | Sonnet ~₹250/₹1250 per M in/out tokens | On-demand |
| Bunny Stream | Day video playback (via content library) | See Curriculum module | Range-request/HLS |

## Validation Rules & Edge Cases
- Enroll requires curriculum `isPublished`; student exists; duplicate blocked by unique index; batch exists.
- Day access: ownership check (enrollment.studentId === user.id) + `1 ≤ day ≤ totalDays`.
- Preview gating: `previewOnly && dayNumber > previewDays` → locked with unlock CTA.
- **Cohort scheduling** (`resolveSchedule`): batch students anchor to earliest enrollment start date (whole cohort on same day); holidays + weeklyOffDays + specialDays skip day counting; preview enrollments keep per-student pacing.
- Sequential-unlock and cohort schedule-lock are currently **disabled** in `getStudentDayPlan` (comment-noted) — days are open regardless of date; only the preview paywall gates.
- `itemDone`: optional items never block; content via completedItems; modules via attempted status.
- **Edge gaps:** no re-fetch when `aiGenStatus` flips generating→done (DayView shows stale "preparing" until manual reload); no receipt/invoice after payment.

## Completion Breakdown
| Dimension | % | Reasoning (from actual code) |
| Backend | 92 | Sophisticated 999-line controller: cohort scheduling, gating, bulk module-status resolution, journey/milestones, enroll student+batch, offering overrides; Razorpay + unlock fully wired |
| Frontend/UI | 90 | Rich student UX (Journey sell page, 792-line DayView, LearningPlanPro tabs/AI/discussion, MyTasks, admin EnrollmentPlans + BatchOfferings) |
| API | 90 | Complete student+admin+payment surface; no route-level roleGuard |
| Database | 95 | Strong indexes + unique constraints; polymorphic day items |
| Automation | 60 | Due-reminder dedupe + paced email exist; enrollment/completion/unlock notifications thin; no auto-refresh on gen |
| AI | 75 | Study assistant + lazy day gen (Claude); milestones rule-based |
| Testing | 10 | `planSchedule.test.ts` exists for scheduling; controllers untested |
| **Overall** | **85** | Most complete module in the domain; gaps = notifications, RBAC, DayView refresh UX, tests |

## Gaps (mark "Not Implemented" where absent)
- **Features:** DayView auto-refresh on `aiGenStatus` change — Not Implemented. Payment receipt/invoice — Not Implemented. Waitlist/over-capacity handling — Not Implemented.
- **APIs:** Route-level roleGuard on admin enrollment/offering routes — Not Implemented (relies on UI + tenant middleware).
- **Validation:** No guard against enrolling into an unpublished/archived offering.
- **Automation:** Enrollment/completion/unlock email/WhatsApp dispatch — thin/Not Implemented. Streak-break nudges — Not Implemented.
- **Notifications:** In-app notification center — Not Implemented.
- **Reports:** Cohort progress dashboard exists (`/:id/progress`); no CSV export.
- **Dashboard widgets:** Per-student drill-down from cohort view — limited.
- **AI:** Assistant depth (context grounding/search quality) partially audited.
- **Security:** GET admin lists lack roleGuard — any authenticated tenant user can list enrollments.
- **UX:** "Preparing your day…" auto-refresh missing; silent failures on some fetches.
- **Audit logs:** No AuditLog for enroll/status changes.

## Technical Debt / Performance / Security / Scalability
- Two enrollment models (legacy `Enrollment` course-level + `CurriculumEnrollment`) — legacy is near-dead; consolidation debt.
- Cohort scheduling logic is intricate (`resolveSchedule`/`bulkScheduleResolver`) — well-optimized for lists but complex; needs tests.
- Missing route-level RBAC is the main security gap.
- Razorpay is wired but lacks idempotency/receipt trail hardening.

## Suggestions & AI Opportunities
- Add `roleGuard(['manage_enrollments'])` to admin routes; keep student routes ownership-checked.
- Implement DayView polling/websocket to auto-swap "preparing" → content when `aiGenStatus: done`.
- Wire completion/streak/unlock notifications (email + WhatsApp already available in platform).
- AI opportunity: personalized daily nudge ("you're 2 days behind, here's a 20-min catch-up"); AI summary of a completed week; smarter study-assistant retrieval over the day's content.
- Payment: add receipt email + invoice PDF + webhook idempotency.

## Estimated Dev Effort
- RBAC on admin routes + audit logs: **1 week**.
- DayView auto-refresh + notification wiring: **1.5 weeks**.
- Payment receipts/idempotency hardening: **1 week**.
- Test coverage (scheduling/gating/enroll): **2 weeks**.
