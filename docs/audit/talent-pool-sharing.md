# Talent Pool Sharing
**Completion:** 70%  |  **Priority:** P1  |  **Business Impact:** High  |  **State:** built + tested on `feature/talent-pool` (2026-11-16), not deployed

## Purpose & Business Goal
Replace the hand-built Excel "talent pool" sheets emailed to placement offices. Each office gets its own login and sees only the candidates shared with it: full profile, resume, its own Excel format. The team tracks every candidate's status at every office in one place. Design: `docs/design/talent-pool-sharing.md`.

## Primary Users & Roles
- **TENANT_ADMIN / roles with `manage_talent_pool`**: add offices, create logins, share candidates, change any status, manage outside candidates. `view_talent_pool` is read-only.
- **PLACEMENT_PARTNER** (new base role): one login per office. Sees the Talent Portal only.

## Key Files
- Models: `server/src/models/TalentPool.ts` (TalentPartner, TalentCandidate, TalentShare); `StudentProfile.placementPreferences` (expectedRole, preferredLocations).
- Service: `server/src/services/talentPoolService.ts` (flat candidate view, Excel export per office, Excel import with header aliases, Placement Desk import).
- Controllers/routes: `talentPoolController.ts` + `talentPoolRoutes.ts` (`/api/v1/talent-pool`); `talentPortalController.ts` + `talentPortalRoutes.ts` (`/api/v1/talent-portal`).
- Access: `middleware/placementPartnerScope.ts`, applied in `middleware/auth.ts`.
- Client: `pages/TalentPool/` (Offices, Share, Tracker, Outside candidates), `pages/TalentPortal/`, `api/talentPoolApi.ts`; `utils/product.ts` keeps an office on `/talent-portal`.

## Security
- **Deny-by-default.** `authMiddleware` refuses a PLACEMENT_PARTNER token on every API except `/talent-portal/*`, the account's own `GET /users/:id`, and `GET /users/me/permissions`. This is necessary because some routes check only that someone is logged in (`GET /users` for one).
- `permissionsOf` returns `[]` for the role, ignoring custom roles and Roles-screen edits.
- Sockets: an office joins no room. The learning-library video stream also refuses the role.
- Portal handlers scope every query by the caller's own TalentPartner. A share id from another office returns 404.
- Switching an office off deactivates its user, and the next request gets a 401.

## Tests
`server/src/tests/integration/talentPool.int.test.ts` (17 tests):
- the office gets 403 on users, Placement Desk and the admin API;
- isolation between offices (read and write);
- statuses and admin override;
- Excel in custom columns;
- import from mixed header styles with de-duplication;
- switch-off.

`client/src/utils/product.test.ts` covers the office redirect.

## Gaps / Next
- Only one login per office.
- No email to the office when new candidates are shared.
- No student consent checkbox (DPDP).
- "Selected" is not written into Placement Desk history.
- No completeness nudges to students.
- The CGPA→% import conversion assumes ×9.5.
