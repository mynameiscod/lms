# Talent Pool Sharing — Phase 1 plan

Status: Phase 1 DEPLOYED (d380a3a9, 2026-11-16). Phase 1b (office workspace) BUILT 2026-11-16, not deployed.

## Problem

Placement offices keep asking for a "talent pool" Excel sheet, each with their own column names. Today
the team builds a sheet per office by hand, emails it, and loses track of what was shared and what
happened to each student.

## What we build

Each placement office gets **its own login** on platform.codebegun.com (normal email + password, the
existing Forgot Password flow). After login they see only a **Talent Pool portal** listing the
candidates the admin shared with that office, with full details, and they can update each
candidate's status. Admins see every office and every status in one place.

## Owner decisions (2026-11-16)

| Question | Decision |
|---|---|
| Access | Normal login per office (email/password + forgot password). No secret links. |
| Logins per office | One login per office for now. |
| Who updates status | Both — the office and the admin team (admin can override). |
| Contact details | Shown to the office upfront (phone, email, address — everything). |
| Who can be shared | LMS students **and** outside candidates. |
| Isolation | Every office has a separate list; nothing is visible across offices. |

## Data

### New role: `PLACEMENT_PARTNER`
- Added to the `User.role` enum (`server/src/models/User.ts`) with an empty permission list in
  `roleGuard.ts`.
- **Deny-by-default:** in `authMiddleware` (`server/src/middleware/auth.ts`), right after the user is
  loaded, a `PLACEMENT_PARTNER` request is rejected with 403 unless its URL is under
  `/api/v1/talent-portal` or is one of the account basics (`/auth/me`, change password, logout).
  This is the guarantee: many routes check only "is logged in", so blocking at the one shared
  middleware closes all of them at once instead of trusting each route's guard.
- The client sends this role straight to `/talent-portal`; sidebar and every other route are hidden.

### `TalentPartner` (the placement office)
`tenantId, name, contactName, email, phone, city, notes, userId (the login), active,
exportColumns[] { field, label, order }, createdBy, timestamps`
- Deactivating the office also sets the linked user `isActive=false` (existing auth already
  rejects inactive users on the next request).

### `TalentCandidate` (outside candidate profile)
Outside people have no StudentProfile, so they get their own record with the same fields:
`tenantId, fullName, phone, email, gender, address, city, linkedInUrl, githubUrl, resumeUrl,
tenth {school, year, percent}, twelfth {college, group, year, percent},
graduation {degree, branch, college, year, percent}, skills[], expectedRole, preferredLocation,
source ('manual' | 'placement_desk' | 'excel'), placementDeskCandidateId?`
- Can be added by hand, imported from Placement Desk outside candidates, or uploaded from Excel.

### `TalentShare` (one candidate shared with one office) — the core record
`tenantId, partnerId, kind ('student' | 'external'), studentId? | talentCandidateId?,
status, statusHistory[] { status, by, byRole ('admin' | 'partner'), note, at },
partnerNote, sharedBy, sharedAt, firstViewedAt?, lastViewedAt?, removedAt?`
- Unique index on `{partnerId, studentId}` / `{partnerId, talentCandidateId}`.
- Every portal query filters by the logged-in user's `partnerId` — the office never passes it.
- Statuses: `shared → viewed → shortlisted → interview → selected | rejected | on_hold`.
  `viewed` is set automatically the first time the office opens the profile.

### Student profile additions
`StudentProfile` gets `placementPreferences { expectedRole, preferredLocations[] }`, editable by the
student on their profile and by admin. Everything else the offices need already exists
(10th / intermediate / degree with year + %, contact, address, gender, LinkedIn, GitHub, resume URL).

**Data is live**: the portal reads the current profile, not a copy, so an updated resume shows up
without re-sharing.

## Screens

### Admin — `/talent-pool` (permission `manage_talent_pool`)
1. **Offices** — add / edit / deactivate; "Create login" sends the set-password email; per-office
   column setup (pick fields, rename them, order them) for their Excel download.
2. **Share candidates** — pick an office, filter students (batch, course, passout year, degree,
   min %, skills, profile completeness) and outside candidates, tick, share. Shows a warning chip
   on profiles missing resume / marks.
3. **Tracker** — candidate × office grid: "Ravi — shared with 4, shortlisted by 2, selected by 1";
   filter by office / status; admin can change any status (logged as admin).
4. **Outside candidates** — list, add, import from Placement Desk, Excel upload.

### Office — `/talent-portal` (role `PLACEMENT_PARTNER` only)
- Table of their shared candidates: all fields, search, filters, status column.
- Candidate drawer: full profile, resume open/download, LinkedIn / GitHub links, status change +
  note.
- **Download Excel** in that office's saved column format (server-built with `xlsx`, already a
  server dependency).

## API

- `/api/v1/talent-pool/*` — admin (partners, shares, candidates, tracker, import).
- `/api/v1/talent-portal/*` — office: `GET /candidates`, `GET /candidates/:shareId`,
  `PATCH /candidates/:shareId/status`, `GET /export.xlsx`, plus (1b) `/dashboard`, `/companies`
  (+ `/:id/followups`, `/:id/export`), `/followups`, `/openings`, `/submissions`. Every handler
  scopes by the caller's partner record.

## Phase 1b — the office's own workspace (owner request 2026-11-16)
The portal is now a full workspace with a sidebar: Dashboard · Candidates (Shared with You /
Shortlist / Interviews) · Companies · Openings · Sent to Companies · Follow-ups.

- **Companies** (`TalentCompany`): name, website, industry, location, contact person (name,
  designation, email, phone), stage (Prospect → Contacted → Hiring → On hold → Closed), notes, and
  embedded follow-ups (date, what to do, done + outcome). `nextFollowUpAt` is kept on save.
- **Openings** (`TalentOpening`): JD text + optional JD link, positions, experience range, salary
  range (₹ LPA), bond, location, work mode, qualification, skills, interview process, apply-by,
  status (open / on hold / closed).
- **Sent to companies** (`TalentSubmission`): one shared candidate → one company (+ optional
  opening), status Sent → Shortlisted → Interview → Selected → Offer made → Joined (or Rejected /
  On hold / Withdrawn), interview time, remarks, history. Unique per candidate × company × opening.
  Moving forward here also moves the office's own status for the candidate forward (never back,
  never off Rejected).
- **Excel per company**: the office's column format + Position, Status, Interview, Remarks, Sent on
  — the office attaches it when it emails the company (the platform does not email companies).
- **Ownership**: everything is the office's. The admin sees it read-only from the Offices tab
  ("Their companies" → workspace drawer: overview, companies, openings, candidates sent) through
  `GET /talent-pool/partners/:id/workspace`. There is no admin write path.

## Not in Phase 1
Multiple logins per office, email to the office when new profiles are added, student consent
checkbox, "selected" auto-logged into Placement Desk history, profile-completeness nudges to
students, activity analytics beyond first/last viewed.

## Risks / notes
- Profile completeness is the real limiter — many students have blank marks / no resume.
- Sharing contact details with third parties: owner chose "upfront"; a student consent checkbox is
  recommended for a later phase (DPDP Act).
- Tests to write: a `PLACEMENT_PARTNER` token gets 403 on a sample of existing routes (users,
  leads, courses, placement-desk); office A cannot read office B's share by id.
