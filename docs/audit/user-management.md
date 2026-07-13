# User Management
**Completion:** 74%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
CRUD + lifecycle for all users within a tenant: create, invite (email setup-link), bulk-upload students from CSV, activate/deactivate (soft-delete), change role, export to XLSX, and manage lightweight profile fields (phone/bio/avatar/links). Underpins onboarding of every student and staff member.

## Primary Users & Roles
- TENANT_ADMIN / STAFF with `manage_tenant_users` (create, invite, bulk-upload, activate/deactivate, delete, role change, export).
- Any authenticated user (list users in own tenant, view a user, update a profile — see gaps).

## Key Files (traced — real paths)
- `server/src/routes/userRoutes.ts` — full route table; `authMiddleware` + `tenantMiddleware` on all except public `setup-password`.
- `server/src/controllers/userController.ts` — createUser, getUsers, exportUsers, getUserById, updateUserRole, deleteUser, deactivate/activate, inviteStudent, getMyPermissions, setupPassword, updateProfile, bulkUploadStudents, downloadBulkTemplate, avatar upload.
- `server/src/services/userService.ts` — DB layer (all by `userId` — no tenant filter).
- `server/src/models/User.ts`.
- `server/src/utils/profileCompleteness.ts` (used to attach `completeness` to list).
- `client/src/pages/Users/`, `BulkUpload/`, `SetupPassword/`, `ProfileCompletion/`.

## Dependencies & Connected Modules
- Auth (setup-password, reset tokens).
- Batches (invite/bulk-upload checks capacity, auto-enrolls in batch course).
- Enrollment & Course (auto-enroll on invite).
- Student Profiles (completeness % on list).
- Email service (welcome emails).
- AssessmentSubmission (getUserById flags `isCareerPilot`).

## Entry / Exit Points
- Entry: `POST /users`, `GET /users`, `GET /users/export`, `GET /users/:id`, `PATCH /users/:id/role`, `PATCH /users/:id/{activate,deactivate}`, `DELETE /users/:id`, `POST /users/invite/student`, `POST /users/bulk-upload`, `GET /users/bulk-upload/template`, `PATCH /users/:id/profile`, `POST /users/:id/avatar`, `GET /users/me/permissions`, `POST /users/setup-password` (public).
- Exit: created user + setup link (if email failed); XLSX export (Users + Summary sheets); CSV template; welcome emails.

## Database Tables & Relationships
- `User` (soft-delete via `isActive:false`; `batchId`, `resetToken`).
- `Batch` (capacity check, courseId for auto-enroll).
- `Enrollment`, `Course` (auto-enroll + `enrollmentCount` increment).
- `StudentProfile` (completeness join).

## Events / Notifications / Emails / WhatsApp
- Welcome/setup email on create, invite, and per-student in bulk-upload (best-effort; failures surfaced with friendly Gmail/rate-limit messages).
- No audit log entries for user CRUD (AuditLog `USER` enum unused).
- No WhatsApp.

## AI Features
None.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| SMTP/Gmail/Brevo | Welcome/setup emails | ~₹0 Gmail / Brevo paid ~₹1,600/mo+ | Gmail daily cap causes bulk failures |
| xlsx (SheetJS) | User export | ₹0 | In-process |
| multer | Avatar/local upload | ₹0 | Disk storage under /uploads |

## Validation Rules & Edge Cases
- Duplicate email blocked on create/invite.
- Inactive user re-invited → reactivated (name/batch updated).
- Bulk-upload: validates email regex + required fields, checks batch capacity vs available slots, rejects over-capacity batch, per-row success/failure report.
- Delete = soft (isActive:false) + clears reset token on deactivate.
- Avatar: JPEG/PNG/GIF/WebP, ≤5 MB.

## Completion Breakdown
| Dimension | % | Reasoning (from actual code) |
| Backend | 80 | Rich lifecycle: invite, bulk, activate/deactivate, export, auto-enroll all implemented. |
| Frontend/UI | 78 | Users list (with completeness), BulkUpload, SetupPassword, ProfileCompletion pages exist. |
| API | 78 | Comprehensive endpoints; some lack tenant scoping & permission guards (see gaps). |
| Database | 75 | Soft-delete pattern; no `createdBy`/audit trail; services never filter by tenant. |
| Automation | 65 | Auto-enroll + email automation; no reminder resend queue, no CSV-file parse endpoint (client sends JSON). |
| AI | 0 | None (N/A). |
| Testing | 5 | No tests found. |
| **Overall** | **74** | Feature-complete for daily ops; security scoping and audit gaps. |

## Gaps (be specific; mark "Not Implemented" where truly absent)
Missing:
- **Security/Permissions:** `getUserById`, `updateProfile`, and avatar upload have **no roleGuard and no tenant scoping** — any authenticated user can read/update any user by ID across tenants (`User.findByIdAndUpdate(userId,...)` with no tenantId filter in userService). `updateUserRole`/`deleteUser`/`deactivate`/`activate` guard permission but still operate cross-tenant by raw `userId`.
- **Audit logs:** no USER create/update/delete/role-change entries — Not Implemented for this module.
- **Validation:** `updateUserRole` accepts any string role (no enum check at controller; relies on schema); no self-deactivation / last-admin protection.
- **Automation:** bulk-upload consumes a JSON array (CSV parsing happens client-side); `csv-parser` imported but unused server-side.
- **Reports/Dashboard:** export exists; no user-activity/last-login widget.
- **UX:** heavy `console.log` onboarding tracing; no loading/empty-state contract documented.

## Technical Debt / Performance / Security / Scalability issues
- Cross-tenant object access (missing tenant filter) is the top risk.
- `getUsers` attaches completeness by fetching all StudentProfiles for the id set — fine at small scale, N+1-ish for large tenants.
- Two tenant middlewares in play (`tenantMiddleware` header-only vs `tenantResolver` header-or-JWT) — userRoutes uses the stricter header one.
- Inline `require('../models/User')` in the avatar handler (mixing require/import).

## Suggestions & AI Opportunities
- Add `tenantId` to every `userService` query and enforce `req.tenantId` match on `:userId` routes; add roleGuard to profile/avatar routes.
- Add a server-side CSV upload+parse endpoint using the already-imported `csv-parser`.
- Add USER audit events. Add last-admin / self-action guards.
- AI opportunity: smart bulk-upload column mapping + dedupe suggestions via LLM.

## Estimated Dev Effort (to close gaps)
~4–6 dev-days: tenant-scope + guards across user routes (2d), USER audit events (1d), CSV server parse (0.5d), last-admin/self guards (0.5d), tests (1–2d).
