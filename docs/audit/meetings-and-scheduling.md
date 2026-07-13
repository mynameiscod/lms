# Meetings & Scheduling
**Completion:** 45%  |  **Priority:** P3  |  **Business Impact:** Medium

## Purpose & Business Goal
Schedule and track sales/onboarding meetings tied to a **lead** — online demos, trainer calls, campus visits, payment discussions. Part of the CRM funnel (help counselors book and follow up on prospect meetings). Note: this is CRM meeting scheduling, distinct from Live Classes (100ms) and the follow-up reminder system.

## Primary Users & Roles
- **STAFF / TENANT_ADMIN** (`manage_leads`/`create_leads` to write; `view_leads` to read).
- Attendees stored as user-id strings.

## Key Files (traced)
- Model: `server/src/models/Meeting.ts`.
- Controller/Routes: `server/src/controllers/meetingController.ts`, `server/src/routes/meetingRoutes.ts` (6 endpoints).
- Client: `client/src/pages/Meetings/`.

## Dependencies & Connected Modules
- **Lead/CRM** (Meeting.leadId required; activity logged to lead on create).
- **Email/WhatsApp** flags exist (sendEmail default true, sendWhatsApp) but are **not consumed** — no actual send.
- Adjacent (separate) systems: `FollowUpReminder` + `followUpCron`, Live Classes.

## Entry / Exit Points
- Entry: `GET /meetings/upcoming-mine`, `GET /meetings` (filters: leadId/status/type/date/assignedTo), `POST /meetings`, `GET /meetings/:id`, `PUT /meetings/:id`, `DELETE /meetings/:id`.
- Exit: meeting documents; lead activity entry on create. No calendar invite / reminder emitted.

## Database Tables & Relationships
- **Meeting** (tenantId, leadId→Lead required, createdBy→User): type online_demo|trainer_call|campus_visit|payment_discussion, title, scheduledAt (indexed field in queries but **no schema index defined**), durationMinutes (60), status scheduled|completed|cancelled|no_show|rescheduled, attendees[], meetingLink, location, notes, sendWhatsApp, sendEmail, completedAt, cancelledAt, cancellationReason. **No indexes declared on the model.**

## Events / Notifications / Emails / WhatsApp
- `sendEmail`/`sendWhatsApp` flags exist but there is **no delivery code** consuming them — no invite, no reminder is actually sent.
- Lead activity is appended on create.

## AI Features
None.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| — | Flags for email/WhatsApp exist but unused | ₹0 | No live integration in this module |

## Validation Rules & Edge Cases
- Required: leadId, type, title, scheduledAt.
- **No date validation** (past dates allowed), no conflict/availability check, no timezone handling, no attendee validation.
- Delete is a hard delete (no soft-delete/audit).

## Completion Breakdown
| Dimension | % | Reasoning |
| Backend | 65 | CRUD + status transitions + lead-activity log. Missing: actual notification/reminder send, calendar sync. |
| Frontend/UI | 40 | Meetings list view. Missing: create form, calendar view, attendee/reminder config. |
| API | 60 | 6 endpoints. Missing: reschedule history, participant RSVP, recording link. |
| Database | 50 | Model exists but **no indexes** despite querying scheduledAt/status — perf bug. No reschedule history. |
| Automation | 10 | Flags present but no reminder/notification execution; no cron. |
| AI | 0 | None. |
| Testing | 0 | No tests. |
| **Overall** | **45** | Basic CRUD works; automation and calendar/reminders are essentially absent. |

## Gaps (mark "Not Implemented")
- **Automation:** email/WhatsApp invite + reminder send (flags exist, unused) — Not Implemented. Reminder cron (e.g., 24h before) — Not Implemented.
- **Calendar:** Google/Outlook sync, .ics invite — Not Implemented. Availability/conflict detection — Not Implemented. Timezone support — Not Implemented.
- **Data:** DB indexes on scheduledAt/status/tenantId — Not Implemented (perf). Reschedule history — Not Implemented. RSVP tracking — Not Implemented.
- **Analytics:** no-show rate, meeting outcome dashboard — Not Implemented.

## Technical Debt / Performance / Security / Scalability
- Missing indexes on a model queried by date/status = full-collection scans at scale.
- Notification flags that don't do anything are misleading dead config.
- Hard delete loses history.

## Suggestions & AI Opportunities
- Add indexes; wire flags into emailService + WhatsApp; add a reminder cron reusing the follow-up infra.
- Add .ics/Google Calendar invites and conflict detection.
- AI opportunity: auto-suggest best meeting slot from counselor history; auto-draft meeting summary/next-step from notes.

## Estimated Dev Effort
~4–6 dev-days: indexes + reminder cron + email/WhatsApp wiring (2d), calendar invites + conflict check (2d), reschedule history + no-show analytics (1–2d).
