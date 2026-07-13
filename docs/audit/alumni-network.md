# Alumni Network
**Completion:** 61%  |  **Priority:** P3  |  **Business Impact:** Medium

## Purpose & Business Goal
Alumni directory + engagement: maintain graduated-student profiles (employment, testimonials, success stories), let alumni post **job referrals** students can express interest in, and let students request **mentoring** from alumni. Feeds placement social proof ("success stories") and a referral hiring channel.

## Primary Users & Roles
- **COLLEGE_ADMIN / PLACEMENT_OFFICER / TENANT_ADMIN** — manage alumni records, referrals, view mentoring requests.
- **ALUMNI** (optionally linked User) — update profile, create referrals, respond to mentoring requests.
- **STUDENT** — browse directory, express referral interest, request mentoring.

## Key Files (traced)
- Models: `server/src/models/Alumni.ts` (18 fields), `AlumniReferral.ts` (14 fields), `MentoringRequest.ts` (7 fields), `MentorChat.ts` (AI mentor history).
- Service/Controller: `server/src/alumni/alumniService.ts`, `alumniController.ts` (11+ methods).
- Routes: `server/src/alumni/alumniRoutes.ts` (13 routes).
- Client: `AlumniManagement/`, `AlumniDirectory/`.
- Note: `MentorChat` (AI mentor) is served by `routes/mentorRoutes.ts` (`/ai-mentor`), a separate module — not the alumni routes.

## Dependencies & Connected Modules
- **User** (alumni.userId link optional; mentoring studentId).
- **Notification** (admin alerted on referral interest).
- **Placement** (success stories / referrals complement the placement funnel).
- **AI Mentor** (separate `/ai-mentor` module owns MentorChat conversation logic).

## Entry / Exit Points
- Entry: `GET/POST/PUT/DELETE /college/alumni` (+ `/stats`, `/success-stories`); referrals CRUD + `/:id/interest`; mentoring-requests create/mine/`:alumniId`/respond.
- Exit: alumni profiles; stats (by year/dept/company, mentor count); success-stories list; referral list; mentoring request lifecycle.

## Database Tables & Relationships
- **Alumni** (tenantId, userId→User optional): graduationYear (required), currentCompany/role/location/ctcPackage, linkedInUrl, testimonial, story, featured, isAvailableForMentoring. Indexes: tenantId+isActive, tenantId+graduationYear.
- **AlumniReferral** (tenantId, alumniId→Alumni): company/role (required), workMode, deadline, status open|closed|filled, interested[{studentId,studentName,at}]. Index: tenantId+status+createdAt.
- **MentoringRequest** (tenantId, alumniId→Alumni, studentId→User): message (≤1000), status pending|accepted|declined, responseMessage. Indexes: tenantId+alumniId, tenantId+studentId.
- **MentorChat** (tenantId+studentId unique): messages[{role user|assistant, content, at}].

## Events / Notifications / Emails / WhatsApp
- In-app notification to admins when a student expresses referral interest ("🙋 Student interested in a referral").
- **No emails, no WhatsApp, no mentoring-request notifications.**

## AI Features
- **MentorChat** model (user/assistant messages) implies an AI mentor chat, but the conversation logic lives in the separate `/ai-mentor` module — not implemented within the Alumni module. Alumni module itself has **no AI**.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| — | No direct external integrations | ₹0 | AI mentor (if used) costs land in AiUsage under the mentor module |

## Validation Rules & Edge Cases
- Alumni: firstName/lastName/graduationYear required; email lowercased; no email-uniqueness or LinkedIn-URL validation.
- Referral: company/role required; duplicate-interest guarded (won't re-add same student).
- MentoringRequest: alumniId+message required; duplicate-pending guarded (one pending per alumni per student).
- Referral deadline can be past-dated (no enforcement/auto-close).

## Completion Breakdown
| Dimension | % | Reasoning |
| Backend | 70 | Alumni/referral/mentoring CRUD + stats + success stories + interest notification. Missing: mentoring scheduling, feedback, deadline automation, events/donations. |
| Frontend/UI | 65 | AlumniManagement + AlumniDirectory + success stories. Missing: mentoring request/response UI, referral-interest UI, profile detail pages. |
| API | 78 | 13 routes. Missing: mentoring session scheduling, feedback/rating, skill endorsement, batch referral upload. |
| Database | 80 | 4 models + indexes. Missing: audit trail, mentoring-session model, event model, referral hard-deletes. |
| Automation | 15 | Referral-interest notification only. Missing: deadline reminders, stale-request nudges, engagement emails. |
| AI | 20 | MentorChat model exists but logic is external; no matching/recommendation here. |
| Testing | 5 | None. |
| **Overall** | **61** | Directory + referrals + basic mentoring work; scheduling, feedback, and automation are missing. |

## Gaps (mark "Not Implemented")
- **Mentoring:** session scheduling, availability calendar, attendance, mentee feedback, goals/milestones — Not Implemented.
- **Referrals:** formal apply state (vs interest), deadline auto-close + reminders, interview-scheduling link, hires-tracking, CSV upload — Not Implemented.
- **Alumni:** events/reunions, donations, advanced directory search, auto-link on registration, skill endorsements — Not Implemented.
- **Notifications:** emails on mentoring request/response; WhatsApp — Not Implemented.
- **Audit:** profile/referral change history — Not Implemented.
- **AI:** alumni-based job matching, mentor recommendation — Not Implemented.

## Technical Debt / Performance / Security / Scalability
- Referral hard-deletes lose history; no soft-delete.
- Permissive route guards (auth+tenant); role enforcement thin.
- Directory list capped (~60) with no advanced search/pagination.

## Suggestions & AI Opportunities
- Wire emails + notifications on mentoring lifecycle; add referral-deadline cron.
- Add mentoring scheduling (reuse Meeting infra) + feedback loop.
- AI: match students to referrals by skills; recommend mentors; auto-draft alumni outreach for testimonials.

## Estimated Dev Effort
~6–9 dev-days: mentoring scheduling+feedback (2–3d), referral apply/deadline automation (2d), notifications/email (1d), directory search + AI matching (2–3d).
