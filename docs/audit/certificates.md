# Certificates

**Completion:** 62%  |  **Priority:** P2  |  **Business Impact:** High

## Purpose & Business Goal
Issue verifiable, revocable achievement certificates (currently placement) with a unique number + public verify code, downloadable as PDF, and independently verifiable at a public URL. Certificates are a trust/marketing asset (LinkedIn shares, employer verification) and a placement-outcome proof.

## Primary Users & Roles
- **STUDENT / PUBLIC** — view + print certificate, share to LinkedIn, verify authenticity (no auth).
- **TENANT_ADMIN / INSTRUCTOR / placement staff** — list, search, copy verify link, revoke/restore (guarded by manage_leads/manage_tenant/course perms).
- **System** — auto-issue on placement (placementStatusService) or on-demand PDF (placement drive).

## Key Files (traced)
- Model: `server/src/models/Certificate.ts` (type, studentName, title, issuerName, company/role/ctc/score/department, certificateNumber CB-YYYY-XXXXXX, verifyCode unique, revoked/reason/at; idempotency-friendly indexes).
- Service: `server/src/services/certificateService.ts` (`issueCertificate` idempotent, `verifyByCode`, `listCertificates`, `revokeCertificate`).
- Admin controller/route: `server/src/controllers/certificateAdminController.ts`, `certificateRoutes.ts`.
- Public verify: `publicCertificateRoutes.ts` → `/public/certificate/:code`.
- PDF (placement only): `server/src/placement/certificateController.ts` (pdfkit A4, issues + persists cert).
- Auto-issue: `server/src/services/placementStatusService.ts` (on 'placed').
- Client: `CertificatesAdmin` (list/revoke), `CertificateVerify` (`/verify/:code`), `Certificate/CertificatePage` (`/certificate/:type/:token`).
- OG meta (LinkedIn): `server/src/app.ts` `GET /certificate/:type/:token`.

## Dependencies & Connected Modules
- **PlacementDrive / PlacementPartner** (source of placement certs), **User / CollegeMembership** (name/department), **settingsService** (issuer/org name, client URL), **pdfkit**.
- **Separate share-token system** (Submission/QuizAttempt `shareToken`) powers `/certificate/:type/:token` — NOT stored in the Certificate collection (see Tech Debt).

## Entry / Exit Points
- `GET /public/certificate/:code` (verify, no auth).
- `GET /certificates?type=&search=` (admin list), `POST /certificates/:id/revoke`.
- `GET /api/v1/college/placement/:driveId/certificate/:userId` (PDF download; placement-scoped).
- Auto: `placementStatusService.markPlaced` → `issueCertificate`.
- Exit: PDF stream, verify JSON, LinkedIn OG tags.

## Database Tables & Relationships
- `certificates` — tenantId, studentId→User, referenceModel/referenceId (PlacementDrive/PlacementPartner). Unique (tenantId,certificateNumber) + unique verifyCode. Idempotent issuance per (tenant,type,student,reference).

## Events / Notifications / Emails / WhatsApp
- Placement email/in-app "you're placed" mentions the certificate (placementStatusService), but there is **no dedicated "your certificate is ready" notification with the verify link**. No WhatsApp. No email carrying the PDF.

## AI Features
None.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| pdfkit (local lib) | Generate placement PDF | Free (in-process) | No external cost |
| SMTP | Placement congratulation email | Included in mail plan | Doesn't attach PDF |
| — | Public verify page | Free | Self-hosted |

## Validation Rules & Edge Cases
- `issueCertificate` idempotent per (tenant,type,studentId,referenceId) — re-issue returns existing (stable number/code). Good.
- **Collision risk:** `certificateNumber = CB-${year}-${rand(3)}` uses only 3 random bytes (6 hex chars, 24 bits ≈ 16.7M space) with a unique index — a duplicate throws on create and is NOT retried; high-volume years could hit sporadic failures.
- PDF endpoint verifies caller is the student or an admin AND that the student status is 'placed' in the drive.
- `verifyByCode` is cross-tenant by design (code is the secret) — correct, but leaks student name/company/CTC to anyone with the code (intended for verification).
- Revoke defaults to `revoked=true`; restore supported.
- Enum supports course/quiz/assignment/assessment/internship/custom but **only placement is ever issued** into this collection.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 65 | Issue/verify/list/revoke + placement PDF solid. Gaps: cert-number collision not retried; only placement type issued; no generic issuance API; no PDF for non-placement. |
| Frontend/UI | 80 | CertificatesAdmin (list/search/revoke/copy-link), CertificateVerify (public), CertificatePage (view/print/LinkedIn) all complete. |
| API | 60 | Verify + admin list/revoke present. No generic issue endpoint, no PDF for course/quiz certs, no student "my certificates" list endpoint from this collection. |
| Database | 85 | Good model + idempotency + unique constraints. |
| Automation | 60 | Auto-issue on placement only. No auto-issue on course/quiz/assessment completion despite enum support. |
| AI | 0 | None. |
| Testing | 5 | No tests. |
| **Overall** | **62** | Strong placement path + verification; the broader "certificate on any achievement" promise is unbuilt, and two disjoint cert systems coexist. |

## Gaps (Not Implemented)
- **Coverage:** No course/quiz/assignment/assessment/internship certificate issuance into the Certificate collection (enum exists, unused). Quiz/assignment "certificates" live in a separate share-token system with no verify code/revocation/PDF.
- **Unification:** Two certificate systems (verifiable Certificate model vs Submission/QuizAttempt shareToken) — inconsistent, confusing, only one is verifiable/revocable.
- **PDF:** No PDF for non-placement certs; the verifiable cert has no branded template beyond placement.
- **Notifications:** No dedicated certificate-ready notification/email with verify link; no PDF attachment; no WhatsApp.
- **APIs:** No generic `issueCertificate` endpoint, no student "my certificates" listing endpoint.
- **Reliability:** cert-number generation not retried on unique-collision.
- **Reports/Dashboard:** No issuance analytics, no bulk issue, no QR code on PDF/verify page.
- **Security:** verify page exposes name/company/CTC to anyone with the code (by design, but no rate-limiting on `/public/certificate/:code`).

## Technical Debt / Performance / Security / Scalability
- **Dual certificate systems** is the core debt — unify quiz/assignment/assessment onto the verifiable Certificate model.
- 3-byte random number space with no retry → sporadic 500s at scale.
- No QR on PDF for offline verification.
- Public verify endpoint unthrottled (enumeration of leaked codes possible, though codes are 18-byte base64url — practically unguessable).

## Suggestions & AI Opportunities
- Add a generic issuance service + auto-issue on course/quiz/assessment completion; migrate share-token certs onto the Certificate model (with verify code + revocation).
- Retry certificate-number generation on collision (or use a longer token / ULID).
- Branded PDF template for all types + QR code linking to the verify page; email the PDF + verify link on issue.
- AI: auto-compose a personalized achievement blurb + skills summary for LinkedIn sharing.

## Estimated Dev Effort
- Unify cert systems + generic issuance + auto-issue hooks: ~4–5 days.
- Branded multi-type PDF + QR + email-on-issue: ~3 days.
- Collision retry + verify rate-limiting + analytics: ~2 days.

---

### SUMMARY

| Module | Overall% | BE% | FE% | API% | DB% | Auto% | AI% | Priority | Impact | Top-3 Gaps | Third-party + Cost (₹) | 1-line status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Attendance | 68 | 80 | 60 | 80 | 70 | 55 | 0 | P2 | High | No unique index (race); leave counts against %; no auto-absent job | SMTP (mail plan) | Solid CRUD + reports + CSV; integrity & %-math gaps |
| Leave Management | 72 | 80 | 65 | 85 | 80 | 60 | 0 | P3 | Medium | No notifications on apply/decision; no overlap/holiday validation; no un-approve/revert | None | Workflow works + auto-marks attendance; silent, no quotas |
| Live Classes | 74 | 78 | 85 | 80 | 80 | 75 | 70 | P1 | High | Webhook has no HMAC (spoofable); no cancel endpoint; legacy Jitsi system coexists | 100ms (~₹0.35–0.90/participant-min + HLS/rec/transcription), Bunny (~₹0.42/GB + ₹0.85/GB), Claude (~₹0.20–1.25/1K tok) | Polished 100ms webinar UI + AI notes; security & legacy gaps |
| Live Class Attendance | 66 | 75 | 20 | 40 | 85 | 80 | 0 | P2 | Medium | Fragile to dropped webhooks (no fallback watch-time); no absent-marking; no breakdown API/panel | 100ms (bundled) | Auto-attendance from join events; happy-path only |
| Class Recordings | 64 | 70 | 75 | 65 | 85 | 70 | 70 | P2 | Medium | No recovery/re-import action; Bunny-pull failure → expiring URL; no student "recording ready" notice | 100ms (rec+transcription add-on), Bunny (~₹0.42/GB + ₹0.85/GB), Claude (~₹0.20–1.25/1K tok) | Import + AI notes + rich diagnostics; recovery & reliability gaps |
| Certificates | 62 | 65 | 80 | 60 | 85 | 60 | 0 | P2 | High | Only placement issued (enum unused); two disjoint cert systems; cert-number collision not retried | pdfkit (free), SMTP (mail plan) | Verifiable placement certs + public verify; broader coverage unbuilt |

**Domain-level notes:**
- **Top cross-cutting risk:** the unauthenticated `POST /hms/webhook` (no HMAC) underpins Live Classes, Live Class Attendance, and Class Recordings — a single security fix hardens three modules (prevents forged attendance + injected Class Hub videos).
- **Two legacy/parallel systems** add debt: LiveSession/Jitsi vs LiveClass/100ms; and share-token quiz/assignment certs vs the verifiable Certificate model.
- **No automated tests** across the entire domain (all modules ~5% testing).
- **AI present** only in the recording/live-class notes pipeline (Claude via aiGateway); attendance/leave/certificates have clear AI opportunities (at-risk prediction, leave classification, LinkedIn achievement blurbs).

