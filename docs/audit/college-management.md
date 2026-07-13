# College Management
**Completion:** 61%  |  **Priority:** P2  |  **Business Impact:** High

## Purpose & Business Goal
The academic-institution layer that turns the LMS into a college platform: **Departments**, **CollegeMembership** (maps a User to a college role + department + year + academic record), **CollegeCurriculum** (year/semester/subject structure), and **CRTSessions** (Corporate Readiness Training — aptitude/verbal/GD/mock-interview sessions with attendance). Foundational for placement eligibility, student segmentation, and college reporting.

## Primary Users & Roles
- **COLLEGE_ADMIN / TENANT_ADMIN** — manage departments, memberships, curriculum, CRT.
- **DEPT_HEAD** — own department + its students.
- **CRT_TRAINER** — create/run CRT sessions, mark attendance.
- **STUDENT** — view own membership + college portal; attend CRT (attendance marked by trainer).

## Key Files (traced)
- Models: `server/src/models/Department.ts` (9 fields), `CollegeMembership.ts` (20 fields), `CollegeCurriculum.ts` (nested semesters/subjects), `CRTSession.ts` (16 fields).
- Services/Controllers: `server/src/college/{department,membership,curriculum}Service.ts` + `*Controller.ts`; `server/src/crt/crtController.ts`.
- Routes: `college/departmentRoutes.ts` (6), `membershipRoutes.ts` (8), `curriculumRoutes.ts` (5), `crt/crtRoutes.ts` (7).
- Client: `Departments/`, `CollegeMembers/`, `CollegeCurriculum/`, `CollegeSettings/`, `CRTManagement/`, `StudentCollegePortal/`.

## Dependencies & Connected Modules
- **Placement** (eligibility reads CollegeMembership CGPA/branch/year/backlogs; rollNumber resolution).
- **Course** (curriculum subjects link `courseId`; department `courseIds`).
- **User** (membership.userId, department.headUserId, CRT trainerId).
- **Alumni** (graduation → alumni is a conceptual next step, not automated).

## Entry / Exit Points
- Entry: `GET/POST/PUT/DELETE /college/departments` (+ `/report`); `/college/membership` (list/me/user/:id/upsert/academic/deactivate/bulk); `/college/curriculum` CRUD; `/college/crt` CRUD + `/:id/attendance`.
- Exit: department/membership/curriculum/CRT docs; department report aggregation; attendance records.

## Database Tables & Relationships
- **Department** (tenantId+code unique): headUserId→User, courseIds[]→Course, totalStudents/activeBatches (manual/computed).
- **CollegeMembership** (userId+tenantId unique): collegeRole (COLLEGE_ADMIN|DEPT_HEAD|PLACEMENT_OFFICER|CRT_TRAINER|STUDENT), departmentId→Department, yearOfStudy [1-4], rollNumber, cgpa (0-10), backlogs, semesterGrades[{semester,sgpa}]. Indexes: userId+tenantId unique, tenantId+role+isActive, tenantId+dept+year.
- **CollegeCurriculum** (tenantId+departmentId+yearOfStudy unique): semesters[{semesterNumber 1-8, subjects[{name,code,credits,type,courseId}]}].
- **CRTSession** (tenantId): trainerId→User, topic (aptitude|verbal|technical|soft_skills|resume|gd|mock_interview|domain|other), targetYears[], scheduledAt, attendance[{userId,status present|absent|late}], status. Indexes: tenantId+scheduledAt/trainerId/status.

## Events / Notifications / Emails / WhatsApp
- **None.** No email/notification/WhatsApp triggers anywhere in the college module — a notable gap (no CRT reminders, no membership-change alerts).

## AI Features
None.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| — | No external integrations | ₹0 | 100ms exists platform-wide but CRTSession has no live-video/recording link |

## Validation Rules & Edge Cases
- Department: name+code required; code uppercased; unique per tenant (409 on dup).
- Membership: userId+collegeRole required; CGPA 0-10; unique per user/tenant; no rollNumber uniqueness enforcement.
- Curriculum: unique dept+year; semesterNumber 1-8; no total-credit validation, no elective-group ("choose 2 of 5").
- CRT: title+scheduledAt required; no future-date check; can target empty years.
- Route guards are permissive (auth+tenant only; controller-level role checks appear thin).

## Completion Breakdown
| Dimension | % | Reasoning |
| Backend | 75 | Full CRUD for 4 entities + bulk membership import + attendance. Missing: graduation workflow, GPA recompute, transcript, auto-membership. |
| Frontend/UI | 70 | Departments, CollegeMembers, Curriculum builder, CRTManagement, StudentCollegePortal, CollegeSettings all present. Missing: analytics dashboards, transcript view, attendance dashboard. |
| API | 85 | 26 routes cover CRUD. Missing: batch academic updates, enrollment/graduation routes, export routes. |
| Database | 85 | Solid schema + right indexes. Missing: audit trail on academic changes, curriculum versioning. |
| Automation | 10 | Only manual attendance marking. No reminders, no graduation/GPA jobs. |
| AI | 0 | None. |
| Testing | 5 | None. |
| **Overall** | **61** | Operational CRUD backbone; workflow automation, notifications, and analytics are missing. |

## Gaps (mark "Not Implemented")
- **Notifications:** CRT session reminders, membership-change alerts, email/WhatsApp — Not Implemented.
- **Workflow:** auto-create membership on signup, graduation (Year 4→Alumni), GPA recalculation, transcript generation — Not Implemented.
- **Curriculum:** prerequisite mapping, elective groups, credit roll-up validation — Not Implemented.
- **CRT:** attendance QR, recording storage, student feedback form, completion certificate — Not Implemented.
- **Analytics:** department/college performance dashboards — Not Implemented (only a report endpoint).
- **Audit:** membership CGPA/backlog change history — Not Implemented.
- **Security:** explicit college-role guards on routes — thin/Not Implemented.

## Technical Debt / Performance / Security / Scalability
- Permissive route guards + no role enforcement risks cross-role access within a tenant.
- Manual totalStudents/activeBatches counters drift from reality (no computation job).
- No audit trail on academic records (grade tampering undetectable).

## Suggestions & AI Opportunities
- Add role guards; add CRT reminder cron (reuse existing reminder infra); wire notifications/email.
- Add graduation + GPA-recompute jobs and transcript PDF (pdfkit already used elsewhere).
- AI: auto-summarize CRT feedback, recommend CRT topics per student weakness, generate curriculum from a template.

## Estimated Dev Effort
~8–12 dev-days: role guards + notifications/CRT reminders (2–3d), graduation/GPA/transcript (3–4d), curriculum validation + electives (2d), analytics dashboards (2–3d).
