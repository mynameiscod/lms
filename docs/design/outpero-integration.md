# Outpero (AI calling) integration

**Status:** Part A (leads → Outpero) BUILT 2026-10-07. Part B1–B4 (call results → LMS) BUILT 2026-10-09; field names
to be confirmed from the first real delivery ("Show last delivery (raw)" on the Outpero page). B5 report not built.

Outpero is the external AI calling agent ("Jyothi", Training Institute Counsellor). It calls every lead it is
given within seconds, and after each call it can POST the result back.

## Part A — sending leads (built)

Screen: **Leads → Outpero AI Calls** (`/admin/outpero`, permission `manage_leads`).

| Mode | What happens |
|---|---|
| **Off** (default) | Nothing leaves the LMS. Use when Meta forms are connected directly inside Outpero. |
| **Manual** | An admin picks a group (stage / source / course) and presses Send. |
| **Automatic** | Every new lead matching the source/course filters is sent as it arrives (all 7 create paths, via a Lead post-save hook). |

- Contract (Outpero "Instant leads"): `POST <endpoint>`, header `X-Outpero-Lead-Secret`, JSON
  `{ lead_name, phone (E.164), course, lms_lead_id, source }`. 200 queued · 401 wrong secret · 422 no phone.
- Stored per institute in tenant settings (`OUTPERO_*`); the secret is encrypted.
- State on each lead: `lead.outpero = { status pending|sent|failed, via auto|bulk, attempts, nextAttemptAt, sentAt, httpStatus, lastError }`.
- Retries: network/429/5xx after 1, 5, 15, 60 min; 401/422/no phone are final. Timeline note on the outcome.
- Bulk sends are spaced at **leads per minute** (default 5) by a one-minute job (`jobs/outperoForwardCron`),
  so 274 leads do not become 274 simultaneous calls. "Stop waiting sends" and "Retry not-sent" on the page.
- Test lead to your own number from the page (Jyothi really calls).
- Overlap: if **Leads → AI Call Config** (the LMS's own AI calling) is also on, a lead can get two AI calls.

## Part B — call results back

**As built (2026-10-09):** `POST /api/v1/public/outpero/calls/<token>` (token per institute, setting
`OUTPERO_WEBHOOK_TOKEN`, shown with Copy/Rotate on the Outpero page). Every delivery stored in `outperocalls`
(upsert by call id, last 5 raw bodies kept). Lead matched by `lms_lead_id`, else phone. On the lead: aiCallLogs entry +
timeline, summary/outcome note, captured variables into empty `customFields`, demo follow-up from
`demo_date`/`demo_time`/`demo_mode`, call follow-up from `callback_date`/`callback_time`/`counsellor_callback`, the
`not_interested_reason` on the timeline (stage left to a person), `whatsapp_consent`. Each action once per call.
Variables Jyothi captures as of 2026-10-09: qualification, current_status, graduation_year, college, city,
previous_training, placement_support, online_offline, preferred_timing, joining_timeline, budget_concern,
whatsapp_consent, demo_date, demo_time, demo_mode, callback_date, callback_time, counsellor_callback, not_interested_reason.

### Original design

Outpero → AI employee → Outcomes → **Post-Call Webhooks → Add Webhook**. Per its screen, every delivery has the
recording URL, full transcript, duration, status (completed/voicemail), hangup reason and timestamps; the
**summary, outcome and extracted variables** are added once the call is classified — "may be null on a call
that hasn't classified yet". So one call can arrive twice; the second fills in what the first lacked.

Variables Jyothi captures today: `graduation_year`, `branch`, `current_skills`, `job_status`, `support_needed`,
`appointment_time`, `interest_level`, `objection`, `preferred_callback_time`.

### B1 — Receive and store
- `POST /api/v1/public/outpero/calls/<token>` — `<token>` is a long random value per institute shown on the
  Outpero page; unknown tokens 404. If Outpero offers a signing secret on webhooks, verify it as well.
- Store every delivery raw in `outperocalls` (upsert by Outpero call id), so nothing is lost while the mapping
  is tuned, and so a re-delivery updates rather than duplicates.
- **Step 0:** add the webhook, press Outpero's test, read the stored payload, then fix the field names below.

### B2 — Match the lead
1. `lms_lead_id` (sent with every lead in Part A) if Outpero echoes it back.
2. Otherwise the phone (last 10 digits) within the institute, newest lead first.
3. No match → keep the call as "unmatched" on the Outpero page with a "link to lead" action.

### B3 — Show it on the lead
- Timeline entry "📞 AI call by Jyothi — 3m 12s — Interested", with recording player, transcript, summary.
- Reuse `lead.aiCallLogs` (recordingUrl, transcript, duration, outcome) so the existing Calls tab shows it.
- Captured variables fill empty lead fields (graduation year, branch, skills, job status) and a new
  "AI call answers" block; never overwrite what a counsellor typed.

### B4 — Act on it (each switchable on the Outpero page)
| Result | Action |
|---|---|
| `interest_level` high / outcome interested | priority → hot; notify the assigned telecaller (bell) |
| `appointment_time` / `preferred_callback_time` | create a follow-up at that time, assigned to the lead owner |
| not interested / wrong number | **suggest** the lost/not-interested stage (one click), never move it silently |
| voicemail / no answer | mark for retry; optional auto re-send to Outpero after N hours (max attempts) |
| `objection` | shown on the lead and counted in the report |

### B5 — Report
Outpero page panel: calls, connected %, interested, appointments booked, objections top 5, cost per
interested lead (Outpero credits ÷ interested), per source and per course.

### Open questions for Part B
1. Does Outpero send a webhook signature header? (Decides auth beyond the URL token.)
2. Does it echo `lms_lead_id` (or the whole intake payload) back? (Decides matching.)
3. Which outcome values does it use? (Decides the B4 rules.)
