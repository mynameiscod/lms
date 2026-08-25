# CodeBegun Admin Core — full style migration

## Scope

This migration applies the CodeBegun System Style Guide to **every non-student LMS screen rendered inside the shared `Layout`**. The scope is role-based instead of a manually maintained route list, so new LMS admin routes automatically inherit the same visual system.

The following product areas are covered in the current master application:

- Dashboard and operational overview
- Users and unified student detail
- Fees and billing administration
- Roles and permissions
- Batches
- Skill assessment administration and candidates
- Concerns
- Attendance marking and reports
- Quiz management, registrations, question bank and reports
- Assignment management, submissions and reports
- Coding assessment management and grading
- College administration: departments, members, curriculum, CRT, placement drives, placement analytics, alumni, certificates, reports and settings
- Learning administration: content library, curriculum builder, enrollments and batch offerings
- Weekly reports
- Student Features
- API logs and diagnostics
- Tenant management and platform settings
- Tech Battles administration
- Interview question bank and scheduled interviews
- AI interview templates, question bank, assignments and analytics
- Communication Lab management
- Thinking Lab bank and Daily Lab Tracks
- Resource Library administration
- Speaking Tasks
- Leave Requests
- Career Profiles
- Placement Partnership
- Leads/CRM administration and operational supporting screens rendered in the LMS shell
- Shared instructor/admin preview routes rendered in the LMS shell

## Explicit exclusion

`/admin/passport/*` and `/admin/careerpilot/*` are excluded. CareerPilot is a separate product surface and keeps its own design system.

## Design system applied

- Brand navy: `#051D64`
- Brand teal: `#359AAD`
- LMS primary: `#005897`
- Action blue: `#1976D2`
- Canvas: `#F4F8FC`
- White cards with `16px` radius
- Soft neutral borders and restrained shadows
- Inter-first typography
- JetBrains Mono/Cascadia fallback for code/log surfaces
- Consistent form controls, tables, tabs, badges, modals, status states and CTA hierarchy
- Responsive behavior for desktop, tablet and mobile
- Visible keyboard focus and reduced-motion support

## Architecture

`Layout.tsx` checks the authenticated role. Any user whose role is not `STUDENT` receives the `admin-core-layout` / `admin-core-surface` scope, unless the current path belongs to CareerPilot admin. A route key is emitted as `data-admin-core-route` for targeted family-level refinements.

This avoids duplicating styles across 60+ components and prevents future admin screens from silently drifting away from the shared system.

## Backend / API impact

None. No API contracts, server routes, persistence models, permissions, business rules, or page state logic are changed by this migration.
