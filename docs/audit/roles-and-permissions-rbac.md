# Roles & Permissions (RBAC)
**Completion:** 78%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
Authorize what each user can do. Combines a fixed base-role map (`ROLE_PERMISSIONS`) with optional tenant-defined **custom roles** (extra permissions layered on top of the base role). Guards routes via `roleGuard([perms])`. Central to least-privilege access for all 24+ feature modules.

## Primary Users & Roles
- Base roles (User.role enum): SUPER_ADMIN, TENANT_ADMIN, INSTRUCTOR, STAFF, STUDENT, GUEST. **ATTENDANCE_ADMIN** exists in `ROLE_PERMISSIONS` but is NOT in the User schema enum (inconsistency).
- TENANT_ADMIN / anyone with `manage_roles` — create/edit custom roles.
- CollegeMembership adds a parallel college-role hierarchy (COLLEGE_ADMIN, DEPT_HEAD, PLACEMENT_OFFICER, CRT_TRAINER, STUDENT) — separate from RBAC permissions.

## Key Files (traced — real paths)
- `server/src/middleware/roleGuard.ts` — `PERMISSION_GROUPS` (22 groups), `ALL_PERMISSIONS`, `ROLE_PERMISSIONS`, `roleGuard()`.
- `server/src/models/Role.ts` — custom role (`name`, `permissions[]`, `tenantId`).
- `server/src/routes/roleRoutes.ts` — CRUD + add/remove permissions + `/permissions/available`.
- `server/src/controllers/roleController.ts` — handlers (tenant-scoped via req.tenantId).
- `server/src/services/roleService.ts` — all queries filtered by `{ _id, tenantId }` (properly scoped).
- `server/src/controllers/userController.ts` `getMyPermissions`, `authService.login` — permission resolution.
- `server/src/models/CollegeMembership.ts` — college role layer.
- `client/src/pages/Roles/`.

## Dependencies & Connected Modules
- Every guarded route across the codebase depends on `roleGuard` + `ROLE_PERMISSIONS`.
- Auth (login resolves & returns effective permissions).
- Multi-Tenancy (custom roles scoped per tenant).
- Tenant Modules (module gate is a separate layer, not permission-based).

## Entry / Exit Points
- Entry: `GET /roles`, `GET /roles/:id`, `POST /roles`, `PUT /roles/:id`, `DELETE /roles/:id`, `POST/DELETE /roles/:id/permissions`, `GET /roles/permissions/available`, `GET /users/me/permissions`.
- Exit: role docs; permission catalogue (`PERMISSION_GROUPS`); effective permission array injected into login response.

## Database Tables & Relationships
- `Role` (`tenantId` → Tenant; unique-ish by name+tenant enforced in service, not DB index).
- `User.customRoleId` → Role, `User.role` (base enum), `User.leadDataScope` (ALL/TEAM/OWN — extra data-scope dimension for leads).
- `CollegeMembership.collegeRole` (parallel hierarchy).

## Events / Notifications / Emails / WhatsApp
None.

## AI Features
None.

## Third-Party Integrations & Cost
None.

## Validation Rules & Edge Cases
- Custom-role name uniqueness per tenant enforced in `roleService` (create + update).
- `roleGuard` merges base + custom permissions (`Set` dedupe); custom roles **extend, never replace** base.
- `some()` semantics: passing multiple required perms means "any one suffices" (OR) — intentional but easy to misuse as AND.
- If `customRoleId` lookup fails, falls back to base permissions (fail-open to base, not fail-closed).

## Completion Breakdown
| Dimension | % | Reasoning (from actual code) |
| Backend | 85 | Guard + merge logic solid; permission catalogue is large and current (22 groups). |
| Frontend/UI | 75 | Roles page exists with permission picker; no per-user permission override UI beyond custom-role assignment. |
| API | 82 | Full CRUD + add/remove perms + available-permissions endpoint; tenant-scoped. |
| Database | 75 | Role scoped by tenant; name uniqueness only in service (no compound unique index → race duplicates possible). |
| Automation | 40 | No permission-change audit; no default seed roles per tenant. |
| AI | 0 | None (N/A). |
| Testing | 5 | No tests. |
| **Overall** | **78** | Robust base + custom-role model; consistency & audit gaps. |

## Gaps (be specific; mark "Not Implemented" where truly absent)
Missing:
- **Consistency:** `ATTENDANCE_ADMIN` present in `ROLE_PERMISSIONS` but absent from `User.role` enum — such a user can never be created via schema; role map has a dead entry.
- **DB integrity:** no compound unique index `{name, tenantId}` on Role (uniqueness only checked in service → concurrent create race).
- **Fail-open:** custom-role DB error falls back to base permissions silently — should log/deny.
- **OR vs AND:** `roleGuard` only supports "any-of"; no "all-of" combinator.
- **Audit logs:** role/permission changes not audited — Not Implemented.
- **Per-user overrides:** no deny-list or per-user permission grant beyond assigning a custom role.
- **UX:** no diff/preview of effective permissions when assigning a custom role.
- **Testing:** none.

## Technical Debt / Performance / Security / Scalability issues
- `roleGuard` queries `Role.findById` on every request for custom-role users (per-request DB hit, no cache).
- Permission list is hardcoded in one large file — adding a module means editing `PERMISSION_GROUPS` + `ROLE_PERMISSIONS` by hand (drift risk; several modules' guards rely on exact strings).
- College-role hierarchy (`CollegeMembership`) is entirely disconnected from `roleGuard` — college roles grant nothing at the permission layer.

## Suggestions & AI Opportunities
- Add compound unique index on Role; cache custom-role permissions (short TTL) to cut per-request lookups.
- Introduce fail-closed on custom-role errors and a `requireAll` variant.
- Emit audit events on permission add/remove.
- Bridge `CollegeMembership.collegeRole` into effective permissions (e.g., PLACEMENT_OFFICER → placement perms).
- AI opportunity: "explain this role" / least-privilege suggester that flags over-permissioned custom roles.

## Estimated Dev Effort (to close gaps)
~3–5 dev-days: enum/role cleanup + unique index (0.5d), permission caching + fail-closed (1d), audit events (1d), college-role → permission bridge (1–1.5d), tests (1d).
