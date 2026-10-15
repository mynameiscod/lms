# CodeBegun Universal MCP

The server exposes 15 read-only tools at `POST /mcp` using stateless Streamable HTTP and JSON responses. It negotiates MCP 2025-03-26, 2025-06-18 and 2025-11-25. GET/SSE and DELETE sessions are not implemented and return 405. It does not claim support for later protocol versions, stdio, writes, bulk exports, recordings or transcripts.

## Identity and permission boundary

The first-party OAuth sign-in calls the same `authenticateLmsCredentials` service as ordinary LMS login. Passwords and LMS JWTs never go to the assistant. The MCP endpoint accepts only the OAuth access tokens issued here; legacy JWT switches have no effect, even outside production.

Every request resolves the active user, active tenant and current custom role from MongoDB. A missing role, cross-tenant role, deleted/inactive account, tenant move, password change, revoked grant or removed client fails closed. Custom roles replace base permissions, matching Roles & Permissions. No role, including Super Admin, receives implicit `mcp_connect` access.

Access is the intersection of client scope allowlist, explicit user consent, current MCP domain permission, native LMS feature permission, tenant module switches and record restrictions. See `server/src/mcp/tools.ts` for the authoritative catalog and schemas.

| Domain | Tools | MCP permission | Native LMS permission (any listed) |
|---|---|---|---|
| Students | `codebegun_student_count`, `codebegun_students` | `mcp_students_read` | `view_enrolled_students`, `manage_tenant_users`, `manage_all_users`; students can read themselves |
| Batches | `codebegun_batches` | `mcp_batches_read` | `manage_tenant_courses`, `view_courses` |
| Attendance | `codebegun_attendance_summary`, `codebegun_attendance` | `mcp_attendance_read` | `mark_attendance`, `view_attendance` |
| Exams | `codebegun_exam_summary`, `codebegun_exams` | `mcp_assessments_read` | `view_exams`, `manage_exams`, `view_grades` |
| Fees | `codebegun_fee_summary`, `codebegun_fees` | `mcp_finance_read` | `view_fees`, `manage_billing`; students can read their own fees |
| Placements | `codebegun_placement_summary`, `codebegun_placements` | `mcp_placements_read` | `manage_placement`, `manage_placement_status`, `view_placement` |
| CRM | `codebegun_lead_summary`, `codebegun_leads` | `mcp_leads_read` | `view_leads`, `manage_leads` |
| Outpero | `codebegun_call_summary`, `codebegun_calls` | `mcp_calls_read` | `manage_leads` (matches the existing Outpero route) |

Every tool also requires `mcp_connect`. Tenant admins have tenant-wide academic scope; instructors and staff have only actively assigned batches; students have only their own records and current batch. CRM uses the same precedence as LMS lead scope: explicit user setting, then `manage_leads` = ALL, `assign_leads` = TEAM, otherwise OWN. TEAM includes active direct reports in the same tenant. Call ownership joins both tenant and lead ID; unmatched calls are visible only in ALL scope. No endpoint initiates phone calls or sends messages.

## Query and privacy controls

All data queries include the authenticated tenant. A supplied tenant header has no authority. Tool schemas reject unknown keys, objects in ID fields, arbitrary MongoDB operators, noninteger limits, and invalid date windows. List tools accept `limit` (1–50), `after` (the previous `nextCursor`) and `recordId`. Academic tools additionally accept `studentId` and/or `batchId` to narrow scope. Filters are ANDed with authorization constraints. Queries have a five-second server-side time budget and responses a 128 KiB cap.

Projections exclude passwords, reset credentials, personal contact exports, identity documents, payment instruments/references, exam answer keys, raw webhooks, provider settings, recordings and transcripts. Call summaries are bounded to 1,200 characters and identified as untrusted source data; their natural-language content may still include personal information entered in the source system. They require explicit call consent and current lead-management permission.

Audit records contain only generated request IDs, actor/tenant/client IDs, the server-selected operation, allowed/denied/failed outcome, reason code and timestamp. No arguments, response records, authorization code, token, password or full URL is logged by MCP. Data and tokens are withheld if an audit write fails. The isolated router is mounted before the legacy LMS access/error loggers and permissive CORS middleware.

## Operation

Read [the OAuth design](mcp-chatgpt-oauth.md) and [the release gate](../runbooks/mcp-release-gate.md). The feature is disabled by default. No production rollout is performed by this branch or its CI.
