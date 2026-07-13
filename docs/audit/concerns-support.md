# Concerns / Support
**Completion:** 55%  |  **Priority:** P3  |  **Business Impact:** Medium

## Purpose & Business Goal
Lightweight student "raise a concern / doubt" support-ticket system routed to mentors/staff. Lets a student flag content/technical/mentor/payment issues (optionally tied to a specific learning-plan day/page); staff triage and respond. Reduces silent churn from unresolved frustration.

## Primary Users & Roles
- **STUDENT** — raise a concern; view own concerns (`/concerns/my`).
- **MENTOR / STAFF / TENANT_ADMIN** — list all, respond, change status.

## Key Files (traced)
- Model: `server/src/models/Concern.ts`.
- Controller/Routes: `server/src/controllers/concernController.ts`, `server/src/routes/concernRoutes.ts` (4 endpoints).
- Client: `client/src/pages/AdminConcerns/` (admin queue). Student raise-a-concern is embedded in the learning experience (context carries enrollmentId/day/page).

## Dependencies & Connected Modules
- **Learning Plan** (context: enrollmentId, curriculumTitle, dayNumber, page).
- **User** (studentId, respondedBy).
- Referenced in memory as pending "Slice 5 raise-a-concern" for the assessment sell-funnel.

## Entry / Exit Points
- Entry: `POST /concerns` (student raise), `GET /concerns/my` (student, 100 cap), `GET /concerns` (staff, 300 cap + status filter + open-count), `PATCH /concerns/:id` (staff respond + status).
- Exit: concern document; staff dashboard list with open-count badge.

## Database Tables & Relationships
- **Concern** (tenantId→Tenant, studentId→User, respondedBy→User): category content|technical|mentor|payment|other, message (≤2000), context{enrollmentId, curriculumTitle, dayNumber, page}, status open|in_progress|resolved, response, respondedAt. Indexes: tenantId+status+createdAt, tenantId+studentId.

## Events / Notifications / Emails / WhatsApp
- **None.** No notification or email fires when a concern is raised or answered — a real gap (student isn't told their concern was resolved).

## AI Features
None.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| — | No external integrations | ₹0 | Pure DB CRUD |

## Validation Rules & Edge Cases
- Message required, max 2000 chars; category enum (defaults 'other'); context optional.
- studentName/email cached from User at creation.
- STUDENT can only read own concerns (`/my`); respond is non-STUDENT only.

## Completion Breakdown
| Dimension | % | Reasoning |
| Backend | 70 | CRUD + status + open-count work. Missing: notifications on change, mentor assignment, SLA, threaded replies. |
| Frontend/UI | 50 | AdminConcerns queue exists; student raise-form embedded. Missing: student "my concerns" detail view, response UX polish. |
| API | 75 | 4 endpoints cover the lifecycle. Missing: search, assignment, bulk actions, attachments. |
| Database | 80 | Good schema + indexes. Missing: audit trail, soft-delete. |
| Automation | 20 | No automation at all — no notify/escalation/SLA. |
| AI | 0 | None. |
| Testing | 0 | No tests. |
| **Overall** | **55** | Functional ticket loop, but silent (no notifications) and one-way (no threading). |

## Gaps (mark "Not Implemented")
- **Notifications:** notify student when resolved; notify staff when raised — Not Implemented.
- **Workflow:** assign to specific mentor/staff — Not Implemented. SLA/response-time tracking — Not Implemented. Escalation of long-open concerns — Not Implemented.
- **Threading:** back-and-forth conversation (response is one-way) — Not Implemented.
- **Attachments:** file/screenshot upload — Not Implemented.
- **Analytics:** resolution-time/category dashboards — Not Implemented.
- **AI:** auto-categorize/auto-suggest reply — Not Implemented.

## Technical Debt / Performance / Security / Scalability
- Staff list fetches up to 300 docs unpaginated.
- No linkage from concern back into a mentor's task list.

## Suggestions & AI Opportunities
- Wire into the existing Notification + Email services on raise/resolve (low effort, high UX win).
- Add mentor assignment + SLA timer + escalation cron.
- AI opportunity: auto-classify category, suggest a draft answer from KB/lesson content, and route to the right mentor.

## Estimated Dev Effort
~3–5 dev-days: notifications+email hooks (1d), assignment+SLA+escalation (1–2d), threading+attachments (1–2d).
