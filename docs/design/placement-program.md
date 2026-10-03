# Placement Program

Ads (Instagram / YouTube / Google) → landing form → WhatsApp confirmation → paid interview booking →
interview → agreement → security cheque → placement. LMS students can be pushed into the same pipeline.

## Decisions (2026-10-03)

| Topic | Decision |
|---|---|
| Storage | ONE collection, `placementcandidates`, for ad leads **and** pushed LMS students; one record per (tenant, mobile). Timeline in `placementevents`. |
| Interview fee | **50% refundable**. Admin "Refund 50%" issues a Razorpay refund; the percentage is a setting. |
| Interviewers | **Several staff**, each with their own weekly hours, days off and one permanent meeting link (kept in the LMS — no calendar connection). Least-busy free interviewer gets the booking. |
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
| P3 | Interview scorecard (configurable criteria 1–5 + recommendation + notes), unmarked-interview flags + interviewer email, Kanban board | **Built** |
| P4 | Admin-written agreement (merge fields, versions) e-signed with WhatsApp code + PDF; private security-cheque upload and lifecycle | **Built** |
| P5 | Add LMS students (charge/waive per student), message a whole stage, Meta Conversions API + Google Ads offline-conversion CSV | **Built** |

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

## Phase 3 notes

- "Attended" requires the scorecard: every configured criterion rated 1–5 (Settings → Interview scorecard, up to 8)
  and a recommendation (strong yes / yes / maybe / no). The average and recommendation are copied to the candidate
  and the timeline. No-show needs only a confirmation.
- After an attended interview the candidate panel offers Selected / Not selected (stage change, recorded).
- An interview still "booked" 30 min after it ends is flagged on the Interviews tab and in the candidate panel; the
  interviewer gets one email (claimed in the DB, `reminded.outcome`) linking to My Placement Interviews.
- Board tab: Kanban of every candidate by stage (withdrawn excluded, capped at 1000); drag a card to change stage.

## Phase 4 notes

- Agreement template lives in Settings (title + body with `{{name}} {{first_name}} {{mobile}} {{email}} {{college}} {{fee}}
  {{refundable_pct}} {{refund_amount}} {{date}} {{org}}`); every change bumps the version. Unknown fields stay visible in
  the preview so typos are caught.
- "Send agreement" (only after Selected) freezes the rendered text on the candidate — later edits never change it — and
  sends `PLACEMENT_AGREEMENT_SENT` (first name, page link).
- Signing on the candidate page: tick "I agree" + type the registered full name (case/punctuation-insensitive) + WhatsApp
  code (`pp-agree:<id>`). Evidence stored: signedAt, typed name, IP, user agent, OTP verified, SHA-256 of the frozen text.
  PDF built on demand from the frozen text + evidence (admin and candidate).
- Security cheque: candidate uploads after signing (JPG/PNG/WEBP/PDF ≤ 8 MB, 6-digit number, bank, amount, date); stored
  in `uploads/.private/placement-cheques` — never served publicly (explicit 404 + `dotfiles: 'deny'`); admin views via an
  authenticated endpoint. Moves: received → verified → held → returned | deposited (deposit needs a written reason ≥ 10
  chars). Verified → stage `cheque_verified`.

## Phase 5 notes

- Add LMS students (Candidates tab): pick from a batch, charge or waive the fee per student, optional WhatsApp welcome.
  One record per mobile — a student already in from an ad is linked to their LMS account, not duplicated. Students
  without a valid mobile are skipped and listed with the reason.
- Message a stage: any approved template to everyone in the chosen stages; `{name}` and `{link}` (their own page) are
  filled per person. Recorded as a WhatsApp broadcast (Sent history) and per message in the Delivery log + timeline.
- Meta Conversions API (Platform Settings → Meta/WhatsApp: `META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`, optional
  `META_CAPI_TEST_EVENT_CODE`): Purchase (fee paid, value), InterviewAttended, Selected — sent automatically,
  fire-and-forget; phone/email SHA-256 hashed; fbclid passed as `fbc`; `event_id` dedupes retries.
- Google Ads: no API (needs an approved developer token). Settings → Ad conversions downloads an offline-conversion CSV
  (Google Click ID, Conversion Name, Time in +0530, Value, Currency) for candidates who arrived with a gclid. Create the
  conversion actions "Placement Paid", "Placement Interview Attended", "Placement Selected" once in Google Ads.
