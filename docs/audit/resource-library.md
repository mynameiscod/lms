# Resource Library
**Completion:** 85%  |  **Priority:** P2  |  **Business Impact:** Medium

## Purpose & Business Goal
An admin-curated library of downloadable career assets (projects, documents, templates, datasets) with three visibility modes (public / portal / approval-gated), batch targeting, versioned files, an approval-request workflow, download gating, and a full audit trail. Gives students vetted materials and gives admins control + accountability over distribution.

## Primary Users & Roles
- **STUDENT** — browse published resources visible to their batch; request access to approval-gated resources (one active project at a time); download permitted files.
- **TENANT_ADMIN / INSTRUCTOR** (roleGuard: `create_courses`/`edit_courses`/`manage_own_courses`/`manage_tenant`) — create/update/archive/delete resources, upload/version files, review access requests, view audit log.

## Key Files (traced)
- Models: `server/src/models/Resource.ts` (69 lines, embedded versioned files), `ResourceRequest.ts` (36 lines, unique per student+resource), `ResourceAudit.ts` (34 lines, 10 action types).
- Route: `server/src/routes/resourceRoutes.ts` — 11 endpoints; multer disk temp, up to 10 files, ~1 GB each.
- Controller: `server/src/controllers/resourceController.ts` (294 lines).
- Client: `client/src/pages/ResourceLibrary/index.tsx` (student), `client/src/pages/ResourceAdmin/index.tsx` (admin, tabs: resources/requests + audit modal).

## Dependencies & Connected Modules
- **Bunny Storage** (file upload/stream/delete), **notificationService** (not wired on request events — gap), **User/Batch/CurriculumEnrollment** (batch-name resolution for the requests view).

## Entry / Exit Points
- Entry: `/api/v1/resources/*`. Exit: streamed file download (audited, increments `downloadCount`).

## Database Tables & Relationships
- `resources` — `tenantId` (string), embedded `files[]` (fileId/storageKey/version/uploadedBy), visibility/status/batchIds/downloadCount. Index `{tenantId, status, visibility, createdAt}`.
- `resourcerequests` — `resourceId → Resource`, `studentId → User`, unique `{tenantId, resourceId, studentId}`, status (requested/approved/rejected/revoked).
- `resourceaudits` — append-only, `resourceId → Resource`, 10 action types, actor + IP + meta.

## Events / Notifications / Emails / WhatsApp
- **None triggered** on request create or review. Audit log is written, but no notification to admin (on request) or student (on approve/reject). **Notable workflow gap.**

## AI Features
- **None.** Pure file storage + access control.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| Bunny Edge Storage | File storage + streamed download | ~₹0.85/GB/mo storage (~$0.01/GB) + egress | Files up to ~1 GB each, 10/upload; streamed to/from disk temp, never buffered fully |

## Validation Rules & Edge Cases
- Title required; Bunny must be configured; batchIds ObjectId-validated; request note ≤500 chars; one active (pending/approved) request per student across resources; download gated by `canDownload` (public/portal open; approval requires approved request); delete removes Bunny files + cascades ResourceRequest; storageKey stripped from student responses.
- Gaps: no file MIME/extension validation (accepts anything); no post-upload checksum; no download rate limit; approved access never expires; audit IP only when `x-forwarded-for` present; no max-length on title/description.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 90 | Full CRUD + versioning + request workflow + gated download + audit + cascade delete |
| Frontend/UI | 85 | Student grid w/ access states; admin resources/requests tabs, upload form, access modal, audit modal |
| API | 88 | 11 endpoints cover admin + student thoroughly |
| Database | 88 | 3 models, good indexes, unique request constraint, append-only audit |
| Automation | 10 | No notifications on request lifecycle |
| AI | 0 | N/A (none intended) |
| Testing | 0 | No tests |
| **Overall** | **85** | Robust, audited, production-ready; main gaps = request notifications, MIME validation, access expiry |

## Gaps (Not Implemented)
- **Features:** No file MIME/type validation; no access expiry/auto-revoke; no download rate limit; no resource search on tags server-side (client filters only); no preview.
- **APIs:** No notification hooks; no analytics endpoint (top downloads, request funnel).
- **Validation:** Title/description length, file type, checksum — absent.
- **Automation/Notifications:** No admin alert on new request; no student alert on approve/reject/revoke.
- **Reports/Dashboard widgets:** Audit log viewable per resource; no aggregate dashboard (downloads by resource/batch).
- **Analytics:** downloadCount tracked but not surfaced in analytics.
- **Security:** Good (gated download, audit, tenancy). Audit IP unreliable without proxy header.
- **Error/Loading/Empty states:** Present (errors via alert()).
- **Audit logs:** Comprehensive (10 actions). **Mobile:** Not verified.

## Technical Debt / Performance / Security / Scalability
- Missing MIME validation is a mild security/integrity risk on a file-distribution feature.
- Approved requests grant perpetual access (no revocation-on-expiry) — governance gap.
- Notification omission makes the approval workflow feel dead to both sides.

## Suggestions & AI Opportunities
- Wire notificationService into request create/approve/reject/revoke (infra already used elsewhere).
- Add MIME allowlist + optional virus scan; add access expiry.
- Surface a downloads/requests analytics widget.
- AI opportunity: auto-tag/summarize uploaded resources; recommend resources to a student based on their target role / assessment skill gaps.

## Estimated Dev Effort
- Notifications + MIME validation + access expiry: ~3 dev-days.
- Analytics widget + server-side search: ~2 dev-days.
- AI auto-tag/recommend: ~3 dev-days.
- Tests: ~2 dev-days. **Total to "93%": ~2 weeks.**
