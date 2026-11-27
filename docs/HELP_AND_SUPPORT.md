# Help & Support (CareerPilot)

Members raise tickets, search help articles and ask an AI assistant. Staff work a ticket queue, manage articles, watch a dashboard and see detected errors. Built on the existing auth, tenants, custom roles, notifications, AI gateway, rate limiter and logger.

Branch: `UI_Flow_fixes`. Phases 2–8 are separate commits.

---

## 1. Architecture

### Who is who

| Kind | How someone gets it | Reach |
|---|---|---|
| requester | any signed-in user (students; faculty are requesters who also see faculty articles) | own tickets, own tenant |
| coordinator | `TENANT_ADMIN`, or an active `CollegeMembership` as `COLLEGE_ADMIN` / `PLACEMENT_OFFICER` | every ticket of their tenant, read only, never internal notes |
| agent | custom role with `support_agent` | tickets of their tenant; reply, internal notes, assign, status |
| manager | custom role with `support_manager` | agent + help articles, settings, incidents |
| super_admin | `User.role = SUPER_ADMIN` | everything in their tenant |

**Cross-tenant reach.** Agents, managers and super admins whose tenant is `SUPPORT_HQ_TENANT_ID` reach every tenant. Every cross-tenant ticket read is written to the support audit log. If the variable is unset, nobody reaches across tenants.

Rules live in `server/src/data/supportPolicy.ts`. The actor is built from the login and the database (`services/supportAccess.ts`), never from the request body. Tenant isolation is a query filter (`ticketScope`), not a check after loading.

### Server

| Area | Files |
|---|---|
| Rules | `data/supportPolicy.ts` |
| Access | `services/supportAccess.ts`, `middleware/supportAccess.ts` (`requireSupport`, `requireMonitor`) |
| Tickets | `services/supportTicketService.ts`, `controllers/supportTicketController.ts`, `services/supportAttachments.ts`, `services/supportTicketNumber.ts` |
| Help articles | `services/supportFaqService.ts`, `controllers/supportFaqController.ts` |
| Assistant | `services/supportAssistantService.ts`, `controllers/supportAssistantController.ts` |
| Dashboard, incidents, settings | `services/supportAnalyticsService.ts`, `controllers/supportAnalyticsController.ts` |
| Monitoring | `services/supportMonitoring.ts`, `services/sentryForwarder.ts`, `services/supportErrorsService.ts`, `middleware/monitoring.ts`, `routes/monitorRoutes.ts` |
| Notifications | `services/supportNotify.ts` (in-app, fire-and-forget), `services/supportEmailChannel.ts` (opt-in e-mail) |
| Retention | `services/supportRetention.ts` (daily job) |
| Cross-cutting | `middleware/requestId.ts` (X-Request-Id), `utils/redact.ts` (every log line), `middleware/rateLimit.ts` (support policies) |

### Models

| Model | Purpose |
|---|---|
| `SupportTicket` | the ticket |
| `SupportMessage` | public replies and internal notes |
| `SupportChatSession` | assistant conversations |
| `SupportFaq` | help articles; weighted text index |
| `SupportFaqVote` | one helpfulness vote per person per article |
| `SupportSearchLog` | searches, including unanswered ones |
| `SupportAuditLog` | the support audit trail |
| `SupportConfiguration` | settings: one document per tenant, plus `tenantId: null` for the platform default |
| `SupportCounter` | ticket number sequence |
| `SupportIncident` | confirmed shared incidents |
| `SupportRelease` | release markers |
| `SupportErrorGroup` | grouped technical errors |
| `SupportMetricCounter` | hourly counts |

### Client

| Area | Location |
|---|---|
| Member pages (`/careerpilot/support/*`) | `client/src/pages/Passport/MemberSupport.tsx` |
| Admin pages (`/admin/support/*`) | `client/src/pages/Support/AdminSupport.tsx` |
| Shared components | `client/src/pages/Support/*` |
| API | `client/src/api/supportApi.ts`; labels in `supportLabels.ts` |
| Browser monitoring | `client/src/utils/clientMonitor.ts` and `components/AppErrorBoundary.tsx`, both installed in `index.tsx` |

**Menu entries.**
- **Member menu:** "Help & Support". It shows a badge with unread replies and has an institute switch (`support`) under Student Features → CareerPilot tab.
- **Admin menu:** "CareerPilot Help & Support", with tabs Tickets, Dashboard, Help articles, Errors and Settings.

### Guarantees

- **Internal notes:** never sent to members or coordinators. They are excluded in the query.
- **Mass assignment:** request bodies pass through explicit allow-lists (`pickAllowed`). Identity, tenant, status and source always come from the server.
- **The assistant:**
  - It answers only from retrieved published articles. With no match it gives the fixed fallback without calling the model.
  - It never creates or claims a ticket. Ticket-like claims and requests for secrets are replaced by the fallback.
  - A message that looks like a password, code or card number never reaches the model.
- **Targets:** SLA targets, incident rules and retention are empty until a manager sets them. Empty means no target is shown, no SLA figure is computed, detection is off and nothing is deleted.
- **Attachments:**
  - Allowed types are JPG, PNG, WEBP and PDF, up to 5 MB each and 3 per message.
  - The file's bytes must match its declared type.
  - Files are stored under `uploads/.private/support/<ticketId>/`, which is never served statically.
  - Downloads check who is asking, and send `nosniff` and `no-store`. PDFs download rather than opening in the page.
- **Logs:** every log line, the access log URL and the referrer are redacted. Secrets are replaced; e-mail addresses and phone numbers are masked.
- **Errors:** error responses carry a `requestId` and never a stack.

---

## 2. API reference

Base path: `/api/v1/support`. A login is required everywhere except `/api/v1/monitor/client-errors`. Responses use the usual envelope: `{ success, message, data }`, plus `requestId` on errors.

### Members (any signed-in user)

| Method | Path | Notes |
|---|---|---|
| GET | `/me` | Returns `kind`, `can.{viewCollege,readInternal,work,manage}` and `canMonitor` |
| POST | `/tickets` | Body: `subject, description, module, category, route, relatedRequestId, diagnosticsConsent, diagnostics, chatSessionId`. Rate limit: 10 per hour. An identical resend within 2 minutes returns the same ticket with `duplicate: true`. |
| GET | `/tickets/mine` | `?status&page&limit` |
| GET | `/tickets/unread` | `{ unread }` |
| GET | `/tickets/:id` | Returns ticket, messages and timeline. Staff also get `errors.{linked,possiblyRelated}`. |
| POST | `/tickets/:id/messages` | Multipart or JSON: `body`, `files[]`. Staff may add `internal`, `requestInfo`, `resolve`. Rate limit: 30 per 10 minutes. |
| POST | `/tickets/:id/reopen` | `reason?`. Follows the reopen policy. |
| GET | `/tickets/:id/attachments/:attachmentId` | Access-checked download |
| GET | `/faqs/suggest?q` | Live suggestions; not logged |
| GET | `/faqs/search?q` | Logged, including unanswered searches |
| GET | `/faqs/categories`, `/faqs?category&module` | |
| GET | `/faqs/:id` | |
| POST | `/faqs/:id/vote` | `{ helpful: boolean }` |
| GET | `/chat/suggestions` | |
| POST | `/chat` | `{ message, sessionId? }`. Rate limit: 20 per 10 minutes. Returns 503 with `retryable: true` when the AI is unavailable. |
| GET | `/chat/:id` | |
| POST | `/chat/:id/feedback` | `{ turnIndex, helpful }` |
| POST | `/chat/:id/close` | |

### Staff

| Method | Path | Capability |
|---|---|---|
| GET | `/queue` | viewCollege. Filters: `status, priority, module, category, source, assignee (me\|none\|id), escalated, reopened, tenantId (HQ), q, from, to, sort (newest\|oldest\|urgent\|activity), page, limit` |
| GET | `/agents` | work |
| PATCH | `/tickets/:id` | work. Body: `status, priority, assigneeId ('me'\|id\|null), escalated` |
| POST | `/tickets/bulk` | work. Body: `{ ids[≤100], update }`; reports per ticket |
| GET | `/analytics/summary`, `/analytics/trends`, `/analytics/breakdown` | viewCollege. `?from&to&tenantId(HQ)` |
| GET / POST | `/incidents`; `/incidents/:id/resolve` | viewCollege to read; manage to confirm or resolve |
| GET / PUT | `/admin/config` | manage. `?scope=platform` (HQ only) |
| GET / POST / PATCH | `/admin/faqs`, `/admin/faqs/:id`, `/admin/faqs/:id/status`, `/admin/faqs/insights` | manage |
| GET / PATCH | `/admin/errors`, `/admin/errors/:id`, `/admin/errors/counters`, `/admin/errors/config` | super admin, or HQ manager / HQ user with `view_activity_logs` |

### Monitoring intake

`POST /api/v1/monitor/client-errors` with `{ events: [...] }`, at most 10 events per call. The login is optional. Rate limit: 30 per minute.

---

## 3. Environment variables

| Variable | Needed | Default | What it does |
|---|---|---|---|
| `SUPPORT_HQ_TENANT_ID` | to let CodeBegun staff answer every college | unset (no cross-tenant reach) | tenant id of the support HQ (production CodeBegun tenant: `69c7723868202a8e4616ef3d`) |
| `SENTRY_DSN` | optional | unset (errors still grouped in-app) | forwards sanitised error groups to Sentry |
| `RELEASE_VERSION` | recommended | `GIT_SHA`, then the server package version | release tag on errors and on the trend chart |
| `REACT_APP_RELEASE` | optional, at client build | unset | release tag on browser error reports |
| `SUPPORT_EMAIL_NOTIFICATIONS` | optional | off | `true` sends support notices by e-mail through the existing e-mail provider |
| `FRONTEND_URL` (or `CLIENT_URL`) | for e-mail links | — | already used by other e-mails |

The AI assistant uses the existing AI settings: OpenAI or Anthropic keys in Platform Settings, failover in `aiGateway`, and spend under AI Spend as module `support_assistant`. There are no new keys.

---

## 4. Indexes and migration

There is nothing to migrate: every collection is new. After deploying:

```bash
# production container (WORKDIR /app)
docker exec -it lms-server-$(cat /root/lms/.active-slot) node dist/scripts/supportEnsureIndexes.js
```

This creates all declared indexes, including the FAQ text index. It never drops an index, and it is safe to re-run.

Optional placeholder articles: one draft per category, all marked "needs owner review" and invisible to members.

```bash
docker exec -it lms-server-$(cat /root/lms/.active-slot) node dist/scripts/seedSupportFaqPlaceholders.js           # dry run
docker exec -it lms-server-$(cat /root/lms/.active-slot) node dist/scripts/seedSupportFaqPlaceholders.js --apply
```

`seedSupportDev.ts` is for development and tests only. It refuses to run in production and refuses hosted databases.

---

## 5. Monitoring setup

**Always on, with no credentials needed:**
- **Server:**
  - exceptions;
  - 5xx responses, per route template;
  - slow requests (3000 ms by default);
  - 401, 403 and 429 as hourly counts only;
  - AI failures by cause;
  - MongoDB disconnects and errors;
  - slow database operations (1000 ms by default), from driver command events (`monitorCommands: true`).
- **Browser:**
  - uncaught errors and unhandled rejections;
  - crashed pages, through `AppErrorBoundary`;
  - API calls that fail with a 5xx or a network error.

**How problems are stored and raised:**
- Problems are grouped by fingerprint into `SupportErrorGroup`. Each group stores only a redacted summary, the route template, the module, the release and up to 20 request ids. Groups are written in batches every 15 seconds.
- An alert goes in-app to the HQ's support managers for a critical group, or when a group passes the hourly threshold (20 by default). There is at most one alert per group per hour.
- Thresholds and per-kind severity are set in Admin → Help & Support → Errors config (`/admin/errors/config`).

**Linking errors to tickets:**
- The browser remembers the request id of the last failed call. A ticket raised within 10 minutes carries it, and any group that saw that id is linked to the ticket.
- Staff see linked groups on the ticket, plus groups in the same area within ±30 minutes, marked "possibly related".

**Sentry:** set `SENTRY_DSN`. The first sighting of a group, then at most one event every 10 minutes, is sent through Sentry's envelope API. Info-level groups are not sent. The payload is the same redacted summary.

---

## 6. Deployment checklist

1. Merge `UI_Flow_fixes` when approved, then deploy as usual.
2. Set `SUPPORT_HQ_TENANT_ID` and `RELEASE_VERSION`. Optionally set `SENTRY_DSN` and `SUPPORT_EMAIL_NOTIFICATIONS=true`.
3. Run `supportEnsureIndexes.js`. Optionally run `seedSupportFaqPlaceholders.js --apply`.
4. In Roles & Permissions, create roles with **Support agent** / **Support manager** (Help & Support group) and give them to CodeBegun support staff in the HQ tenant.
5. Write and publish help articles. The assistant can only answer what is published.
6. Optionally fill Admin → Help & Support → Settings: response targets, reopen policy, incident rules, retention.
7. Smoke test:
   1. As a member, raise a ticket and confirm a `SUP-YY-NNNNN` number comes back.
   2. As an agent, reply, add an internal note and assign the ticket.
   3. As the member, check the reply is visible and the note is not.
   4. Ask the assistant something published and something unpublished; the second should give the fallback.
8. Check that `/admin/support/errors` loads for an HQ manager and returns 403 for a college admin.

---

## 7. What the project owner must supply or decide

- **The HQ tenant id** (`SUPPORT_HQ_TENANT_ID`), and who gets Support agent / Support manager.
- **Help articles.** Placeholders are drafts that need owner review. Nothing in the code states fees, refund rules, response times or features.
- **Response targets per priority, if any.** Until set, no target is shown and no SLA is reported.
- **Reopen policy.** Unset means members may reopen with no time limit.
- **Incident rules:** minimum tickets, distinct people and window. Unset means detection is off.
- **Retention for chats and attachments.** Unset means they are kept.
- **Sentry:** whether to use it, and its DSN.
- **E-mail notices:** whether to send them (`SUPPORT_EMAIL_NOTIFICATIONS`).
- **WhatsApp:** not sent. It needs an approved template; it then plugs in through `registerSupportChannel()`.
- **The existing "Concerns" inbox** (`/admin/concerns`, LMS students) is unchanged and separate. Merging the two is a later decision.

## 8. Known limits

- SLA clocks run from creation and do not pause while waiting on the member.
- Hourly alert counts and Sentry throttling are per process. The server runs as a single process today.
- The assistant's real-provider path was exercised only with a mocked model in tests, because no AI keys exist in the development environment. Verify it once where keys are configured.
