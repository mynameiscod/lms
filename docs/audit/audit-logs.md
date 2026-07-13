# Audit Logs
**Completion:** 30%  |  **Priority:** P2  |  **Business Impact:** Medium

## Purpose & Business Goal
Provide a tamper-evident, tenant-scoped trail of who did what (CREATE/UPDATE/DELETE/VIEW/ASSIGN/STAGE_CHANGE/CONVERT/EXPORT/IMPORT/LOGIN/LOGOUT) across modules for compliance, dispute resolution, and security forensics. Intended as a cross-cutting capability; today it is effectively **lead-module-only**, plus a separate raw server-log viewer.

## Primary Users & Roles
- TENANT_ADMIN / STAFF viewing lead activity (`LeadAuditLogs` page).
- Any authenticated user can hit the raw server-log endpoint (see gaps).

## Key Files (traced — real paths)
- `server/src/models/AuditLog.ts` — schema with `action`/`module` enums, `targetType/Id`, `details`, `metadata`, `ipAddress`; indexes on tenant+time/module/user/target; `createdAt` only.
- `server/src/controllers/leadController.ts` (line ~33) — the **only** `AuditLog.create(...)` call in the app.
- `server/src/routes/leadRoutes.ts` — exposes lead audit read.
- `server/src/models/CommunicationAuditLog.ts` + `communicationController.ts` (~481) — a **separate** audit model for the communication lab (parallel, not unified).
- `server/src/routes/adminLogsRoute.ts` — reads raw server log files (errors/all), auth-only.
- `client/src/pages/LeadAuditLogs/`, `client/src/pages/AdminLogs/`.

## Dependencies & Connected Modules
- Lead/CRM (sole writer of `AuditLog`).
- Communication Lab (own audit model).
- Logger util (`utils/logger`) for the raw file log viewer.
- NOT wired into Auth, Users, Roles, Tenants, Settings, Profiles (no writes from any of these).

## Entry / Exit Points
- Entry: lead audit read endpoints (leadRoutes); `GET /api/v1/admin/logs?type=errors|all&lines=N` (raw files).
- Exit: audit rows for leads; last-N reversed server-log lines.

## Database Tables & Relationships
- `AuditLog` (`tenantId` → Tenant, `userId` → User, `targetId` polymorphic). Well-indexed but sparsely populated (leads only).
- `CommunicationAuditLog` (separate schema).

## Events / Notifications / Emails / WhatsApp
None (audit is a sink, not a notifier).

## AI Features
None.

## Third-Party Integrations & Cost
None.

## Validation Rules & Edge Cases
- `action`/`module` enums restrict values (module enum: LEAD/USER/COURSE/QUIZ/ATTENDANCE/MARKETING/SYSTEM — note: no SETTINGS/TENANT/ROLE/AUTH).
- `AuditLog` has no `updatedAt` (append-only by omission, but no DB-level immutability).
- Raw-log endpoint caps lines at 1000 and reverses newest-first.

## Completion Breakdown
| Dimension | % | Reasoning (from actual code) |
| Backend | 35 | Model + indexes exist and are good, but only leads write to it; enum missing key modules. |
| Frontend/UI | 40 | LeadAuditLogs + AdminLogs pages exist, but only cover leads + raw files. |
| API | 30 | Lead read + raw-file read only; no generic audit query API. |
| Database | 55 | Schema/indexes solid; underused. |
| Automation | 15 | No automatic capture across modules; must be hand-called. |
| AI | 0 | None. |
| Testing | 0 | No tests. |
| **Overall** | **30** | Good bones, almost no coverage outside leads. |

## Gaps (be specific; mark "Not Implemented" where truly absent)
Missing:
- **Coverage:** LOGIN/LOGOUT/USER/ROLE/TENANT/SETTINGS/EXPORT events are **Not Implemented** as audit writes despite the model supporting most. Auth, User Management, RBAC, Tenant, and Platform Settings produce **zero** audit entries.
- **Enum coverage:** `module` enum lacks SETTINGS, TENANT, ROLE, AUTH, PLACEMENT, FEE — so even if callers were added, several couldn't be represented.
- **Security:** `GET /admin/logs` is **any-authenticated-user** (the route comment itself says "restrict to admins in the future") — exposes server log contents (paths, user ids, errors) to all logged-in users.
- **No generic API:** no `GET /audit-logs` with filters for the cross-cutting log; only the lead-scoped view.
- **No centralized middleware/helper:** audit writing is ad-hoc in one controller — no reusable `logAudit()` utility.
- **Immutability:** no DB-level protection against update/delete of audit rows.
- **Two parallel models:** `AuditLog` and `CommunicationAuditLog` are not unified.
- **Retention/export:** no retention policy, no CSV/PDF export of the audit trail.
- **Testing/Dashboard:** no analytics or admin dashboard widget over audit data.

## Technical Debt / Performance / Security / Scalability issues
- The raw-log file endpoint reads/splits the whole file into memory each call — O(file size); unbounded logs will hurt.
- Fragmented audit story (two models + file logs) with no single source of truth.
- No IP/user-agent capture except where a caller manually passes `ipAddress`.

## Suggestions & AI Opportunities
- Build a reusable `auditService.log({tenantId,userId,action,module,target,details,ip})` and call it from Auth (login/logout), Users (CRUD/role), Roles, Tenants, and Settings.
- Expand `module` enum; add a generic filtered `GET /audit-logs` (admin-only) + export.
- Lock down `/admin/logs` to SUPER_ADMIN/TENANT_ADMIN.
- Unify CommunicationAuditLog into the main trail or clearly delineate.
- AI opportunity: LLM-generated daily security digest ("unusual admin actions today") + natural-language audit search.

## Estimated Dev Effort (to close gaps)
~6–9 dev-days: reusable auditService + wire into 5 identity modules (2–3d), enum + generic query/export API (1–2d), lock down raw-log endpoint (0.5d), immutability + retention (1d), unify models (1d), dashboard widget (1d).
