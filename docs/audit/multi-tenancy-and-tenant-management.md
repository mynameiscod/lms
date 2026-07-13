# Multi-Tenancy / Tenant Management
**Completion:** 70%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
Isolate every institute/college/corporate on the shared platform via `tenantId`, and let SUPER_ADMIN provision and configure tenants: type, subscription plan, module gates (platform-level on/off), student-feature flags, college info, white-label branding, and fee-receipt settings. Determines what each organization can see and do.

## Primary Users & Roles
- SUPER_ADMIN — list/create tenants, toggle modules (`manage_tenants`).
- TENANT_ADMIN — read own tenant, toggle student features (`manage_tenant`), generate invite links, edit branding/college info.
- All roles — read tenant context (branding, modules) via contexts.

## Key Files (traced — real paths)
- `server/src/models/Tenant.ts` — settings, `studentFeatures` (28 flags), `modules` (16 gates), `collegeInfo`, `branding`, `receipt`.
- `server/src/routes/tenantRoutes.ts` — list/create/get/patch, student-features, modules, invite-link.
- `server/src/controllers/tenantController.ts` — handlers.
- `server/src/services/tenantService.ts` — create/get/update/getAll (getAll filters `isActive:true`).
- `server/src/middleware/tenantMiddleware.ts` — requires `x-tenant-id` header.
- `server/src/middleware/tenantResolver.ts` — header OR JWT `tenantId`.
- `server/src/models/CollegeMembership.ts`, `Department.ts` — college sub-structure.
- `client/src/pages/TenantManagement/`, `CreateOrganization/`, `StudentFeatures/`, `CollegeSettings/`.
- `client/src/contexts/TenantModulesContext.tsx`, `StudentFeaturesContext.tsx`.

## Dependencies & Connected Modules
- Every module scopes reads/writes by `tenantId` (varies in rigor — see Security).
- Auth (register auto-provisions tenants).
- RBAC (custom roles per tenant).
- Platform Settings (per-tenant overrides for email/WhatsApp/Razorpay etc.).
- Fee Management (receipt settings), Branding (white-label).

## Entry / Exit Points
- Entry: `GET /tenants`, `POST /tenants`, `GET /tenants/:id`, `PATCH /tenants/:id`, `GET /tenants/:id/invite-link`, `GET/PATCH /tenants/:id/student-features`, `GET/PATCH /tenants/:id/modules`.
- Exit: tenant docs; invite links; module/feature maps consumed by frontend contexts.

## Database Tables & Relationships
- `Tenant` (slug unique, `adminId` → User, embedded settings/modules/features/branding/receipt/collegeInfo).
- `User.tenantId`, `Role.tenantId`, `StudentProfile.tenantId`, `SystemSetting.tenantId`, `CollegeMembership.tenantId`, `Department.tenantId` — all reference Tenant.

## Events / Notifications / Emails / WhatsApp
- Tenant-admin welcome email on org registration (via authController).
- No tenant lifecycle audit events.

## AI Features
None.

## Third-Party Integrations & Cost
None directly (branding assets/logos referenced by URL; hosting via Bunny handled elsewhere).

## Validation Rules & Edge Cases
- Slug uniqueness on create (service) + schema unique index.
- `updateStudentFeatures` / `updateTenantModules` whitelist allowed keys before `$set`.
- `getAllTenants()` (service) hides inactive; but `listTenants` controller returns all (`Tenant.find({})`) — two divergent behaviors.
- Defaults injected in `getStudentFeatures`/`getTenantModules` when tenant lacks the sub-doc.

## Completion Breakdown
| Dimension | % | Reasoning (from actual code) |
| Backend | 75 | Provisioning, module/feature toggles, branding, college info all implemented. |
| Frontend/UI | 75 | TenantManagement, CreateOrganization, StudentFeatures, CollegeSettings pages + two contexts. |
| API | 72 | Endpoints exist but tenant-ownership checks are weak on read/update (see gaps). |
| Database | 78 | Rich embedded config; good indexes on child collections. |
| Automation | 45 | Welcome email only; no suspend/expire subscription automation, no usage metering. |
| AI | 0 | None (N/A). |
| Testing | 5 | No tests. |
| **Overall** | **70** | Solid config surface; isolation-enforcement and lifecycle gaps. |

## Gaps (be specific; mark "Not Implemented" where truly absent)
Missing:
- **Security / tenant isolation:** `GET /tenants/:id` is auth-only — **any authenticated user can read ANY tenant** by ID (branding, college info, receipt config). `PATCH /tenants/:id/student-features` (guard `manage_tenant`) and other `:id` routes do **not verify the `:id` matches the caller's `req.user.tenantId`** → a TENANT_ADMIN can modify another tenant's config. This is the module's top risk.
- **Subscription lifecycle:** `subscriptionPlan` field exists but no enforcement, billing, expiry, or plan-gated limits — Not Implemented.
- **Tenant suspend/delete:** no soft-delete/suspend endpoint; `isActive` set only at create.
- **Audit logs:** tenant create/update/module-toggle not audited — Not Implemented.
- **Consistency:** `listTenants` vs `getAllTenants` diverge on inactive filtering.
- **Custom domain / branding:** `branding.customDomain` stored but no routing/DNS resolution implemented.
- **Reports:** no per-tenant usage / seat / activity dashboard.
- **Testing:** none.

## Technical Debt / Performance / Security / Scalability issues
- Two competing tenant middlewares (`tenantMiddleware` header-only vs `tenantResolver` header-or-JWT); inconsistent adoption invites header-spoofing if a route trusts `x-tenant-id` without cross-checking JWT.
- Cross-tenant read/write on `:id` routes (above) undermines the whole isolation model.
- Embedded config grows the Tenant doc; fine now, but module list is duplicated across schema defaults + controller whitelists (drift risk).

## Suggestions & AI Opportunities
- Enforce `req.params.tenantId === req.user.tenantId` (or SUPER_ADMIN) middleware on all `:tenantId` routes.
- Standardize on `tenantResolver` and always cross-check header against JWT.
- Add subscription enforcement (seat/module limits) + suspend endpoint + tenant audit events.
- AI opportunity: onboarding assistant that recommends module/feature presets by tenant type (college vs institute vs corporate).

## Estimated Dev Effort (to close gaps)
~6–9 dev-days: tenant-ownership guard middleware + rollout (2–3d), subscription/suspend lifecycle (2–3d), audit events (1d), middleware consolidation (1d), tests (1d).
