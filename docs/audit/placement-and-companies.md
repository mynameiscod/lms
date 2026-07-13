# Placement & Companies
**Completion:** 70%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
Run campus recruitment end-to-end: create **PlacementDrives** (company + role + eligibility + rounds), let eligible students apply, track applicant status (applied→shortlisted→selected→placed), and surface placement analytics (rate, avg CTC, top companies). A parallel **PlacementPartner CRM** sources/contacts hiring companies (outreach sequences, candidate matching, interviews). Student-side **JobApplication** is a personal job-tracker Kanban. Placement is a headline outcome metric for colleges — directly a sales/retention driver.

## Primary Users & Roles
- **PLACEMENT_OFFICER / COLLEGE_ADMIN / TENANT_ADMIN** — create/manage drives, set applicant status, bulk-import results, run partner outreach.
- **STUDENT** — apply/withdraw from drives, view My Applications, maintain personal Job Tracker.

## Key Files (traced)
- Models: `server/src/models/PlacementDrive.ts` (18 fields, applicantStatuses Map, rounds[]), `PlacementPartner.ts` (27+ fields, stage pipeline, outreach/placement sub-docs), `JobApplication.ts` (17 fields, Kanban).
- Services: `server/src/placement/placementDriveService.ts`, `server/src/services/placementStatusService.ts` (markStudentPlaced, notifyDriveStatus, notifyRound, placementOverview), `partnerOutreachService.ts`, `partnerTaskService.ts`, `partnerReplyService.ts`.
- Controllers: `server/src/placement/placementDriveController.ts` (18 methods), `certificateController.ts`, `controllers/jobApplicationController.ts` (5), `placementPartnerController.ts`, `partnerOutreachController.ts`.
- Routes: `server/src/placement/placementDriveRoutes.ts` (19), `routes/jobApplicationRoutes.ts` (5), `routes/placementPartnerRoutes.ts` (31+).
- Client: `PlacementDrives/` (+ BulkStatusImport), `PlacementAnalytics/`, `PartnerPipeline/`, `MyApplications/`, `JobTracker/`.

## Dependencies & Connected Modules
- **User.placement** canonical field (single source of "who is placed"; written by both drive + partner via `markStudentPlaced`).
- **CollegeMembership** (eligibility: CGPA/branch/year/backlogs; rollNumber resolution in bulk import).
- **Certificate** (`issueCertificate` — verifiable placement certificate, idempotent).
- **Notification + Email** (status/round notifications). **Todoist** (partner task reminders, graceful fallback). **IMAP/SMTP** (partner outreach + reply polling).

## Entry / Exit Points
- Entry: `POST/PUT/DELETE /college/placement`, `POST /:id/apply|withdraw`, `PATCH /:id/applicants/:userId/status`, `POST /:id/applicants/bulk-status`, `POST/PUT/DELETE /:id/rounds`, `GET /:id/certificate/:userId`; `GET /college/placement/{stats,snapshot,analytics,overview,my-applications}`; JobApplication CRUD+move; PlacementPartner CRUD/import/match/outreach/interview/mark-placed.
- Exit: drive docs; applicant status updates; in-app+email notifications; placement certificate PDF; analytics JSON; Razorpay-independent.

## Database Tables & Relationships
- **PlacementDrive** (tenantId, applicants[]→User, createdBy→User): eligibility{minCgpa, allowedBranches[], allowedYears[], maxBacklogs}, applicantStatuses Map<userId,status>, rounds[{name,date,venue,description}], status upcoming|ongoing|completed|cancelled. Indexes: tenantId+status+isActive, tenantId+applyDeadline.
- **PlacementPartner** (tenantId+companyKey unique): tier/priority/fresherFit, stage (target→…→placed/not_a_fit) + stageHistory[], outreach sub-doc, placement sub-doc (guaranteeEndsAt), candidates[], interviews[]. Indexes: companyKey unique, stage, tier+priority.
- **JobApplication** (tenantId+studentId): status wishlist|applied|interviewing|offer|rejected, order (Kanban). Index: tenantId+studentId+status+order.

## Events / Notifications / Emails / WhatsApp
- Drive-created event → in-app + eligibility-filtered email to students.
- Status change (shortlisted/selected/rejected) & rounds → in-app + email (`placementStatusService`).
- Placed → congrats notification + email + certificate issuance.
- Partner outreach: SMTP send sequences + IMAP reply polling (auto-stop on reply); Todoist reminders.
- **No WhatsApp** in placement.

## AI Features
- **None in the drive lifecycle.** Partner "draft-vouch" and "draft-candidate-profiles" endpoints exist (likely template/AI-assisted; not confirmed generative). No AI job–student matching, resume parsing, or drive recommendation here.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| SMTP (Hostinger) | Status/round emails + partner outreach | ~₹0 (bundled) | Paced |
| IMAP (Hostinger) | Partner reply polling | ~₹0 (bundled) | `partnerReplyCron` |
| Todoist API | Partner task reminders | ₹0 (free tier) | Graceful fallback if no token |
| pdfkit | Placement certificate + candidate one-pager | ₹0 (lib) | Self-generated |
> No paid gateway in this module. See `_cost-and-integrations.md`.

## Validation Rules & Edge Cases
- Drive: companyName+role required; eligibility CGPA enforced on apply; bulk-status resolves by email or rollNumber (≤1000 rows).
- Partner: companyKey unique per tenant (dedup); enum-validated tier/stage.
- JobApplication: company+role required; auto-timestamps appliedAt on leaving wishlist.
- Gaps: no future-date validation on applyDeadline; no per-round shortlist tracking (global Map only); no overlapping-drive conflict detection.

## Completion Breakdown
| Dimension | % | Reasoning |
| Backend | 82 | Full drive lifecycle, applicant status + bulk import, rounds, analytics, certificate, partner CRM stages 1/3/4. Missing: drive status auto-transition, 90-day guarantee enforcement, full outreach automation confidence. |
| Frontend/UI | 75 | PlacementDrives, Analytics, PartnerPipeline Kanban, MyApplications, JobTracker all built. Missing: round calendar/timeline, interview scheduling UI, negotiation/offer-letter UX. |
| API | 88 | 55+ endpoints across drives/partners/job-apps. Missing: pagination (hard 1000 cap), rate-limit on bulk import, webhooks. |
| Database | 90 | Well-modeled + indexed; stageHistory audit on partners. Missing: materialized analytics, unbounded interviews[]. |
| Automation | 50 | Outreach cron + reply poller + Todoist + event bus. Missing: drive status transitions, deadline reminders, guarantee re-activation. |
| AI | 0 | None in drive lifecycle. |
| Testing | 5 | Test infra only; no placement tests. |
| **Overall** | **70** | Solid drive + CRM core; automation & AI are the growth edges. |

## Gaps (mark "Not Implemented")
- **Automation:** drive upcoming→ongoing auto-transition, application-deadline reminders, 90-day guarantee auto-reactivation — Not Implemented.
- **Drive:** per-round shortlist tracking, resume-requirement flag, cancellation notify/refund workflow — Not Implemented.
- **JobTracker:** link to PlacementDrive, structured salary, offer-letter tracking — Not Implemented.
- **Partner CRM:** algorithmic company/lead scoring, negotiation history — Not Implemented.
- **AI:** resume parsing, AI job–student match, generative vouch, drive recommendations — Not Implemented.
- **Notifications:** WhatsApp for placement — Not Implemented.
- **Testing/Audit:** no tests; drive edits not audited.

## Technical Debt / Performance / Security / Scalability
- Two placement surfaces (drives vs partner CRM) both write User.placement — kept consistent via `markStudentPlaced` but conceptually forked.
- List endpoints cap at 1000 with no pagination — will not scale for large colleges.
- Outreach/IMAP production-readiness needs verification (services exist; end-to-end unclear).

## Suggestions & AI Opportunities
- Add drive status/deadline crons; add pagination.
- AI: parse resumes into structured skills, auto-match students to drives/partners by eligibility+skills, generate personalized vouch emails and candidate one-pagers.

## Estimated Dev Effort
~10–14 dev-days: crons + pagination (2–3d), per-round tracking + drive UX (3d), AI matching + resume parse (3–4d), tests (2–3d).
