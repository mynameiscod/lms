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
| Calendar | Own slot system (not Calendly), because payment gating, status and no-show tracking must be ours. |
| Agreement | In-app e-sign: typed name + WhatsApp OTP + time/IP evidence → locked PDF. Aadhaar eSign later if needed. |

## Phases

| Phase | Scope | Status |
|---|---|---|
| P1 | Public form `/placement-program?tenant=<slug>` with ad attribution, candidate record, WhatsApp confirmation (purpose `PLACEMENT_PROGRAM_REGISTERED`, UTILITY), admin pipeline `/admin/placement-program` (stages, timeline, notes) | **Built** |
| P2 | Interview fee (Razorpay), "payment before booking" toggle, interviewer availability, slot booking + Google Meet, WhatsApp reminders, 50% refund | — |
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
