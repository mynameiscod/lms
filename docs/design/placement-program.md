# Placement Program

Ads (Instagram / YouTube / Google) → landing form → WhatsApp confirmation → paid interview booking →
interview → agreement → security cheque → placement. LMS students can be pushed into the same pipeline.

## Decisions (2026-10-03)

| Topic | Decision |
|---|---|
| Storage | ONE collection, `placementcandidates`, for ad leads **and** pushed LMS students; one record per (tenant, mobile). Timeline in `placementevents`. |
| Interview fee | **50% refundable**. Admin "Refund 50%" issues a Razorpay refund; the percentage is a setting. |
| Interviewers | **Several staff, each with their own Google Calendar** and availability. Round-robin or admin pick; Meet link per booking. |
| Payment gate | Toggle **"Payment before booking"**: ON → calendar unlocks after payment; OFF → book directly. Enforced on the server. |
| Cheque | **Security cheque**: Received → Verified → Held → Returned at program end. Deposited only on breach, with a written reason. |
| Fee for pushed LMS students | **Admin decides per student** (charge or waive). |
| Calendar | Own slot system (not Calendly). **No Google Calendar integration** (team is on Hostinger mail; Google review for personal Gmail takes weeks). Each interviewer has one permanent meeting link; invites go out as .ics email attachments. 100ms rooms or Google Workspace are later upgrades. |
| Agreement | In-app e-sign: typed name + WhatsApp OTP + time/IP evidence → locked PDF. Aadhaar eSign later if needed. |

## Phases

| Phase | Scope | Status |
|---|---|---|
| P1 | Public form `/placement-program?tenant=<slug>` with ad attribution, candidate record, WhatsApp confirmation (purpose `PLACEMENT_PROGRAM_REGISTERED`, UTILITY), admin pipeline `/admin/placement-program` (stages, timeline, notes) | **Built** |
| P2 | Interview fee (Razorpay), "payment before booking" toggle, interviewer availability, slot booking, .ics invites, WhatsApp reminders, refund | **Built** |
| P3 | Interview outcome (attended / no-show, scorecard), auto-flag unmarked slots, Kanban view | — |
| P4 | Agreement e-sign + PDF; security cheque upload and lifecycle | — |
| P5 | Push LMS students (fee per student), bulk WhatsApp by stage, send Paid/Attended conversions back to Meta and Google | — |

## Phase 1 notes

- Ad tracking is captured site-wide on arrival (utm_*, fbclid, gclid); first touch is kept, last touch replaced.
- A repeat submission updates the record (and last touch) and never resets the stage.
- The confirmation is sent only when a template is assigned in Admin → WhatsApp Templates → Where used.
  The timeline records "not sent" otherwise, so nobody assumes a message went out.
- Public POST is rate-limited per mobile (`placementRegister`) and per IP (`signupBurst`).
- Admin API requires `manage_placement` or `manage_tenant`.

## Phase 2 notes

- Candidate page: `/placement-program/me/<token>` — an unguessable link, returned only for a NEW registration
  (a repeat submission never reveals it) and copyable by an admin from the candidate panel.
- Fee is recorded on the candidate (Payment rows require an LMS user). Settlement is atomic on
  `fee.orderId` + `status: created`, so the browser callback and the Razorpay webhook can both arrive.
  The shared webhook (`/payments/webhook`) checks Placement before the hackathon fallback.
- Refund: admin button refunds `refundablePct` of the fee through Razorpay and records it.
- Slots: computed from each interviewer's weekly IST hours and days off, minus bookings and buffer;
  a partial unique index (interviewer, startsAt, status=booked) makes double booking impossible.
- Reminders: WhatsApp 24 h and 1 h before (purpose `PLACEMENT_INTERVIEW_REMINDER`), claimed in the DB
  before sending so blue/green overlap cannot double-send. Booking confirmation: `PLACEMENT_INTERVIEW_BOOKED`
  + .ics email to candidate and interviewer.
- Outcome (attended / no-show): only the booking's interviewer (linked LMS login) or a placement admin.
  Interviewers see "My Placement Interviews" without admin rights.
