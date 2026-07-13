# Student / Instructor Profiles
**Completion:** 76%  |  **Priority:** P2  |  **Business Impact:** Medium

## Purpose & Business Goal
Capture a rich student profile (personal, professional links, education across 10th/12th/degree, technical background, course interest, referral source) with auto-computed completion %, plus admin tooling to review profiles, view student activity, add notes, and nudge incomplete profiles by email. Also stores OAuth (GitHub/LinkedIn) connections. Instructors have no dedicated profile model — only the lightweight `User` fields.

## Primary Users & Roles
- STUDENT — create/update own profile (`/me`), upload photo + resume, connect GitHub/LinkedIn.
- TENANT_ADMIN / STAFF / INSTRUCTOR with `view_reports`/`view_enrolled_students`/`manage_tenant` — view all profiles, stats, activity, notes, send reminders.

## Key Files (traced — real paths)
- `server/src/models/StudentProfile.ts` — full schema + pre-save completion calc + `adminNotes[]` + `oauthConnections` (tokens `select:false`).
- `server/src/routes/studentProfileRoutes.ts` — student `/me` + admin `/admin/*` routes, multer (photo image ≤20 MB, resume PDF).
- `server/src/controllers/studentProfileController.ts` — getMyProfile, saveProfile, getAllProfiles, stats, activity, notes, reminders.
- `server/src/utils/profileCompleteness.ts` — `computeProfileCompleteness` (used on Users list).
- `server/src/controllers/oauthController.ts` — writes tokens to `StudentProfile.oauthConnections`.
- `client/src/pages/StudentProfile/`, `AdminStudentProfiles/`, `ProfileCompletion/`.
- Instructor: only `User` fields (`bio`, `avatar`, `linkedin`, `github`) via `PATCH /users/:id/profile`.

## Dependencies & Connected Modules
- User Management (completeness attached to Users list; `User.profileComplete`).
- Auth/OAuth (token storage).
- Assessment / CareerPilot (profile data feeds scoring — StudentProfile referenced widely).
- Email (profile reminders).

## Entry / Exit Points
- Entry: `GET/POST/PUT /student-profiles/me`, `GET /student-profiles/admin/{all,stats,:userId,:userId/activity}`, `POST /student-profiles/admin/:userId/{send-reminder,notes}`, `POST /student-profiles/admin/send-bulk-reminders`, `DELETE .../notes/:noteId`, `DELETE /admin/:profileId`.
- Exit: profile docs (secrets hidden), stats, activity overview, reminder emails.

## Database Tables & Relationships
- `StudentProfile` (unique `userId` → User; `tenantId` → Tenant; indexes on tenant/email/course/complete; embedded `adminNotes` with author).
- `User` (holds instructor-lite profile fields + `profileComplete`).

## Events / Notifications / Emails / WhatsApp
- Per-student "complete your profile" reminder email + bulk reminder to all incomplete students.
- No WhatsApp; no in-app notification on profile completion.

## AI Features
None in this module (profile data is consumed by AI assessment/career modules elsewhere).

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| GitHub / LinkedIn OAuth | Store connection tokens | ₹0 | Tokens `select:false` |
| SMTP/Gmail/Brevo | Reminder emails | ~₹0 Gmail / Brevo paid | Bulk reminders can hit Gmail cap |
| multer | Photo/resume upload | ₹0 | Local disk `/uploads/profiles` |

## Validation Rules & Edge Cases
- LinkedIn/GitHub URL validators (must contain domain).
- Enum-constrained education levels, languages, technologies, course interest.
- Completion % computed in pre-save; `isProfileComplete` at ≥80%. NOTE: memory records a past mismatch — admin/student endpoints now use stored `profileCompletionPercentage` while Users-list uses `computeProfileCompleteness` util (two code paths, potential drift).
- Upload: photo image-only ≤20 MB (message says "20 MB" but field is photo); resume PDF-only.

## Completion Breakdown
| Dimension | % | Reasoning (from actual code) |
| Backend | 82 | Full CRUD, stats, activity, notes, reminders, completion calc. |
| Frontend/UI | 80 | StudentProfile, AdminStudentProfiles (+ detail), ProfileCompletion pages. |
| API | 80 | Well-structured student + admin surfaces with permission guards. |
| Database | 82 | Thorough schema, good indexes, secure token handling. |
| Automation | 65 | Email reminders (single + bulk); no scheduled nudges, no completion streak. |
| AI | 10 | None here, but profile is AI-consumed downstream. |
| Testing | 5 | No tests. |
| **Overall** | **76** | Strong student profile; instructor profiles are an afterthought. |

## Gaps (be specific; mark "Not Implemented" where truly absent)
Missing:
- **Instructor profiles:** no dedicated instructor profile model — only `User.bio/avatar/linkedin/github`. No expertise, qualifications, or bio-review flow — largely Not Implemented.
- **Two completion code paths:** pre-save `profileCompletionPercentage` vs `computeProfileCompleteness` util → risk of inconsistent % (noted historical bug).
- **Automation:** reminders are manual-trigger; no scheduled/drip reminder job.
- **Audit:** admin note add/delete and profile deletion not audited.
- **Validation:** phone/mobile format not enforced; DOB not range-checked; `admin/:userId` routes rely on permission but not always tenant-ownership of the target user.
- **Security:** admin routes accept `manage_tenant` OR `view_reports` OR `view_enrolled_students` (broad OR) — an INSTRUCTOR with `view_enrolled_students` can read all profiles incl. notes.
- **UX:** no explicit empty/loading/error-state contract documented.
- **Testing:** none.

## Technical Debt / Performance / Security / Scalability issues
- Local disk uploads (`/uploads/profiles`) — not durable/CDN-backed; won't survive blue/green redeploys cleanly, no virus scan.
- Bulk reminder can trigger many synchronous emails → Gmail rate-limit trips (matches known email throttling issues).
- Duplicated completeness logic.

## Suggestions & AI Opportunities
- Unify completion into one shared function; move uploads to Bunny storage (already used elsewhere).
- Add a scheduled reminder job with per-tenant cadence + WhatsApp fallback.
- Build a real instructor profile model.
- AI opportunity: auto-fill profile from an uploaded resume (resumeParserService already exists) and an LLM "profile quality" score with improvement tips.

## Estimated Dev Effort (to close gaps)
~5–8 dev-days: unify completeness (0.5d), CDN uploads (1–2d), scheduled reminders + WhatsApp (1–2d), instructor profile model+UI (2–3d), audit + validation (1d).
