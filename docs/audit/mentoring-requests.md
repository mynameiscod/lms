# Mentoring Requests (& Alumni Referrals)
**Completion:** 68%  |  **Priority:** P3  |  **Business Impact:** Medium

## Purpose & Business Goal
Career-networking layer within the Alumni module: (1) **MentoringRequest** — a student asks a listed alumnus for mentoring; the alumnus (or admin) accepts/declines with a response. (2) **AlumniReferral** — an admin posts a job/internship referred by an alumnus; students express interest, which notifies admins. Connects current students to alumni for guidance and hidden-market job leads.

## Primary Users & Roles
- **STUDENT** — creates mentoring requests, views own requests, browses open referrals, expresses interest (AlumniDirectory page).
- **TENANT_ADMIN / STAFF** — manages alumni + referrals, views requests to an alumnus, responds to requests, receives interest notifications (AlumniManagement page).

## Key Files (traced)
- Models: `server/src/models/MentoringRequest.ts` (31 lines), `server/src/models/AlumniReferral.ts` (49 lines).
- Routes: `server/src/alumni/alumniRoutes.ts` — mounted at `/api/v1/college/alumni` (auth + tenant).
- Controller/Service: `server/src/alumni/alumniController.ts`, `server/src/alumni/alumniService.ts`.
- Client: `client/src/pages/AlumniDirectory/index.tsx` (student), `client/src/pages/AlumniManagement/index.tsx` (admin); API in `client/src/api/index.ts` (mentoring-requests + referrals fully wired).

## Dependencies & Connected Modules
- Part of the **Alumni** module (references `Alumni` model). **notificationService** (admins notified on referral interest). **User/Batch** for names.

## Entry / Exit Points
- Entry: `/college/alumni/mentoring-requests*`, `/college/alumni/referrals*`.
- Exit: in-app notification to admins on referral interest; accept/decline response stored on the request.

## Database Tables & Relationships
- `mentoringrequests` — `tenantId` (**string**), `alumniId → Alumni`, `studentId → User`, status (pending/accepted/declined), `responseMessage`, `respondedAt`. Indexes on `{tenantId, alumniId}` and `{tenantId, studentId}`. Message ≤1000 chars.
- `alumnireferrals` — `tenantId` (**ObjectId** — inconsistent type vs MentoringRequest's string), `alumniId → Alumni`, company/role/ctc/skills/deadline, status (open/closed/filled), embedded `interested[]` (studentId/name/at), `createdBy`. Index `{tenantId, status, createdAt}`.

## Events / Notifications / Emails / WhatsApp
- **In-app only:** admins notified when a student expresses interest in a referral ("🙋 Student interested in a referral").
- **Gaps:** no notification to the alumnus/admin when a mentoring request is created; no notification to the student when it is accepted/declined. Referral express-interest is the only notified event.

## AI Features
- **None.**

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| — | No third-party integrations | ₹0 | CRUD + in-app notifications only |

## Validation Rules & Edge Cases
- Mentoring: `alumniId` + `message` required; one pending request per student per alumnus (409 on duplicate); respond status restricted to accepted/declined.
- Referral: company + role required; students see only open, non-expired (`deadline >= now`) referrals; express-interest blocks if closed / returns `already` if duplicate.
- Gaps: **tenantId type inconsistency** (string vs ObjectId across the two models) — risk when filtering with the wrong type; no cascade — deleting an Alumnus orphans MentoringRequests; no max-length on referral company/role/ctc; no dedup guarantee surfaced on `interested[]` at display; no rate limit on request creation.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 78 | Full CRUD + respond + interest + admin notify; type inconsistency + no cascade |
| Frontend/UI | 70 | Wired in AlumniDirectory (student) + AlumniManagement (admin); depth of mentoring-request UX not deeply audited |
| API | 80 | Mentoring (4) + referral (5) endpoints complete |
| Database | 65 | Works but tenantId type mismatch is a real latent bug; no cascade |
| Automation | 20 | Only referral-interest notification; mentoring lifecycle unnotified |
| AI | 0 | N/A |
| Testing | 0 | No tests |
| **Overall** | **68** | Functional networking feature; held back by notification gaps, tenantId inconsistency, no cascade, low test coverage |

## Gaps (Not Implemented)
- **Features:** No mentoring-session scheduling/chat handoff after acceptance; no referral application tracking (interest → applied → outcome); no student notification of accept/decline.
- **APIs:** No analytics (requests accepted rate, referrals filled).
- **Validation:** Fix tenantId type; add cascade delete; max-length on referral text; request rate limit.
- **Automation/Notifications:** Notify alumnus on new request; notify student on response.
- **Reports/Dashboard widgets:** None for mentoring/referral funnels.
- **Analytics:** None.
- **Security:** Tenancy-scoped; the tenantId type mismatch is the main correctness/security concern.
- **Audit logs / Mobile:** None / not verified.

## Technical Debt / Performance / Security / Scalability
- **tenantId type inconsistency** (MentoringRequest string vs AlumniReferral ObjectId) is a latent query bug — standardize.
- No cascade cleanup on Alumni deletion → orphaned requests.
- Response/accept flow doesn't notify the student — the loop feels dead.

## Suggestions & AI Opportunities
- Standardize tenantId type across alumni models; add cascade delete.
- Notify both sides across the mentoring lifecycle (infra exists).
- Add referral outcome tracking to feed placement analytics.
- AI opportunity: match students to alumni mentors by target role/skill overlap; auto-suggest relevant referrals to students based on assessment profile.

## Estimated Dev Effort
- tenantId fix + cascade + full notifications: ~3 dev-days.
- Referral outcome tracking + analytics: ~3 dev-days.
- AI mentor/referral matching: ~3 dev-days.
- Tests: ~1 dev-day. **Total to "85%": ~2 weeks.**
