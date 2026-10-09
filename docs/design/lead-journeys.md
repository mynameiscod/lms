# Lead Journeys — automated lead → call → demo → follow-up

**Status:** PARKED ENHANCEMENT — planned 2026-10-08, not built. Pick up from §10 (Phase 0).
**Goal:** every lead, from any source, is called within seconds, and what happens next — WhatsApp messages,
brochures, re-calls, demo booking, demo reminders, post-demo follow-ups — runs by itself from rules the admin
defines, with a person able to step in at any point and see exactly why each thing happened.

## Decisions (2026-10-08)

| # | Question | Decision |
|---|---|---|
| 1 | Demo format | **Google Meet link per counsellor** (one permanent link each, kept in the LMS) |
| 2 | Who books the demo | **Both** — the lead picks a slot from a link, **and** the AI books the time it captured on the call (lead confirms) |
| 3 | Demo reminders | **Admin-configured** — any number, any offsets (suggested default 24 h, 2 h, 10 min) |
| 4 | Re-call attempts for no answer | **Admin-configured** — number of attempts and the gap before each |
| 5 | Where it is built | **Inside the LMS** (not Zapier/Make/n8n); an optional "send to webhook" action covers odd extras later |
| 6 | Calling | Outpero (AI employee "Jyothi"), already connected for sending leads (`/admin/outpero`) |

---

## 1. The journey

```
Lead arrives (Meta · Instagram · Google Ads · website · WhatsApp · Sheet · walk-in · manual · API)
  └─ saved as an LMS lead (one record per phone; a duplicate re-entry never restarts a journey)
      └─ AI call within seconds (Outpero, automatic mode)
          └─ call result returns (Outpero post-call webhook)
              └─ RULES pick the next step:
                   ├─ wants a demo, time captured  → demo booked for that time → "confirm" WhatsApp
                   ├─ wants a demo, no time        → WhatsApp booking link → lead picks a slot
                   ├─ call me at X                 → AI re-call scheduled at X + "we'll call you at X"
                   ├─ no answer / voicemail        → re-call per the admin's attempt plan + "we tried calling"
                   ├─ wants details                → brochure PDF + course link on WhatsApp, follow-up next day
                   ├─ placement support            → Placement Program invite
                   └─ not interested / wrong no.   → Lost with reason, journey stops
          └─ demo: confirmation + reminders (admin's list) with the counsellor's Meet link
              └─ counsellor marks Attended / No-show (one tap from the reminder or the demo list)
                  ├─ attended → post-demo sequence (thank-you + brochure, call, offer …) until enrolled or lost
                  └─ no-show  → "sorry we missed you" + rebook link, counsellor follow-up
```

## 2. What exists and what each phase adds

| Block | Exists today | Added by |
|---|---|---|
| Leads from any source | Meta, Google Ads, website (public API per source), Google Sheets, WhatsApp bot, manual | — (clean-up of course/source lists from the Leads review is recommended first) |
| Instant AI call | Outpero automatic mode (4e42848a) | — |
| Call result | — | **Phase 1** — Outpero post-call webhook |
| Rules engine | — | **Phase 1** |
| WhatsApp templates, broadcast, chat, files | Yes (templates, 24 h window, opt-out, human takeover) | Phase 1 adds a **PDF header** to the template editor |
| Demo booking | Placement Program has interviewer availability + slot booking + reminders | **Phase 2** reuses that pattern for demos |
| Configurable reminders | Fixed offsets (placement) | **Phase 2** |
| Follow-ups | Follow-up Calendar (`FollowUpReminder`) | **Phase 3** sequences + status board |
| Visibility | Lead timeline | **Phase 4** journey panel + dashboards |

## 3. Core concepts

### 3.1 Events (what can start or continue a journey)

| Event | Fired by | Carries |
|---|---|---|
| `lead.created` | Lead post-save hook (all sources) | source, campaign, course |
| `call.completed` | Outpero webhook (classified) | outcome, summary, captured fields, duration, recording |
| `call.not_connected` | Outpero webhook (no answer / voicemail / busy / failed) | reason, attempt number |
| `whatsapp.replied` | WhatsApp webhook (existing chat store) | text, button pressed |
| `demo.booked` / `demo.rescheduled` / `demo.cancelled` | Booking page, AI booking, staff | demo id, time, counsellor |
| `demo.reminder_due` | Scheduler | which reminder (offset) |
| `demo.attended` / `demo.no_show` | Counsellor marks (or auto no-show after X min with no mark) | demo id |
| `followup.due` / `followup.done` / `followup.missed` | Scheduler / telecaller | follow-up id, outcome |
| `payment.paid` | Razorpay (existing fee/seat flows) | amount |
| `stage.changed` | Lead stage change | from, to |

### 3.2 Rules (admin-defined)

`WHEN <event> IF <conditions> DO <actions>` — evaluated top to bottom; a rule can say **stop here** so later rules
do not also fire.

- **Conditions** on: call outcome, captured fields (`interest_level`, `appointment_time`, `preferred_callback_time`,
  `objection`, `job_status`, `graduation_year`, …), lead source / course / stage / tag, attempt number, time of day,
  whether a demo already exists, whether the person replied on WhatsApp.
- **Actions:**

| Action | Notes |
|---|---|
| Call now / at a time / after a delay | via Outpero; respects quiet hours and the attempt plan |
| Send WhatsApp template | variables: name, course, demo time, Meet link, booking link, counsellor name, brochure |
| Send booking link | personal, tokenised link to the demo booking page |
| Book demo at captured time | picks a free counsellor at that time, or the nearest free slot; lead confirms by button |
| Create follow-up task | for the lead's owner or a role, with due time and type (call / WhatsApp / meeting) |
| Start a sequence | e.g. "post-demo", "no-answer nurture" (Phase 3) |
| Change stage / add tag / set priority / assign owner | logged with the rule that did it |
| Notify staff | bell + optional WhatsApp/email to the owner |
| Wait | then continue with the next action |
| Send to webhook | optional, for extras (Slack, sheets) |
| Stop journey | |

### 3.3 Journey instance (per lead)

One active journey per lead. It records: current step, every action taken (with the rule that caused it),
what is scheduled next (and when), and status `active | paused | completed | stopped`. Pausing it (button on
the lead, or automatically when staff reply/call by hand) stops all scheduled automation for that lead until
resumed.

### 3.4 Admin-configurable policies

| Policy | Default suggestion | Configurable |
|---|---|---|
| **Re-call plan (no answer)** | 3 attempts: +2 h, +6 h, next day 11:00 | number of attempts, gap before each (minutes/hours/"next day at"), message after which attempt |
| **Demo reminders** | 24 h, 2 h, 10 min before | any number of offsets, template per reminder, on/off per channel |
| **Quiet hours** | 21:00–09:00 IST, no Sundays for calls | window, days; actions due inside it move to the window's end |
| **Message cap** | max 3 automated WhatsApp per lead per day | number |
| **Auto no-show** | demo not marked 30 min after end → no-show | minutes, on/off |
| **Opt-out words** | STOP, UNSUBSCRIBE, "don't call" | list; stops calls and messages |
| **Human takeover** | staff reply or manual call pauses the journey 48 h | hours, on/off |

## 4. Demo booking (Phase 2)

- **Counsellors**: staff marked "demo counsellor", each with weekly hours, days off, demo length, buffer, max
  demos per day and **one permanent Google Meet link** (kept in the LMS; no Google Calendar connection — same
  approach as Placement interviewers).
- **Demo types** (optional): per course, with length and which counsellors can take it.
- **Booking page** `/demo/<token>`: the lead sees free slots (next 7 days, IST), picks one, confirms name/course.
  Mobile-first, no login. Reschedule and cancel from the same link.
- **AI booking**: when the call captured `appointment_time`, book the free counsellor at that time (or the
  nearest slot within ±60 min); WhatsApp "Your demo is at {time} — [Confirm] [Change time]". Unconfirmed after
  X hours → reminder; still unconfirmed → booking link instead.
- **Assignment**: least-busy free counsellor, or the lead's owner if they are a counsellor.
- **Calendar invite**: `.ics` by email when the lead has an email (as Placement does).
- **Counsellor view** "My demos": today's demos, join link, one-tap Attended / No-show / Reschedule, notes.
- **Reminders**: each configured offset sends the reminder template with the Meet link; the counsellor also gets
  a bell 10 min before.

## 5. Follow-ups after the demo (Phase 3)

- **Sequences**: ordered steps with delays, each step an action (WhatsApp template, AI call, task for a person).
  Examples shipped as templates: *Post-demo* (Day 0 thank-you + brochure → Day 1 counsellor call → Day 3 offer →
  Day 7 last call), *No-show* (rebook link → Day 1 call → Day 3 rebook), *Callback nurture*.
- **Exit conditions**: payment made, stage Enrolled/Lost, opt-out, human pause.
- **Follow-up status board**: due today, overdue, done, missed, rescheduled — per telecaller/counsellor, with
  outcome capture (connected / not connected / interested / needs time / not interested) that feeds back into rules.

## 6. WhatsApp templates (Meta approval, once)

| Template | Category | Variables |
|---|---|---|
| `we_tried_calling` | Utility | name |
| `callback_confirmation` | Utility | name, time |
| `course_brochure` | Marketing | **PDF header**, name, course, link |
| `demo_booking_link` | Utility | name, course, booking link (URL button) |
| `demo_confirm_time` | Utility | name, time, [Confirm] [Change time] quick replies |
| `demo_confirmed` | Utility | name, time, counsellor, Meet link |
| `demo_reminder` | Utility | name, time, Meet link (one template for all offsets) |
| `demo_missed_rebook` | Utility | name, booking link |
| `post_demo_thanks` | Marketing | name, brochure/fee link |
| `offer_followup` | Marketing | name, offer text, link |

Template editor change: support a **DOCUMENT (PDF) header** with an uploaded sample file (Meta requires a sample).

## 7. Screens

| Screen | Who | Purpose |
|---|---|---|
| **Leads settings → Automation → Journeys** | admin | rules list (on/off, order), rule editor (When / If / Do), test a rule against a lead, starter templates |
| **Automation → Policies** | admin | re-call plan, reminders, quiet hours, caps, opt-out, takeover |
| **Demos → Counsellors** | admin | counsellors, hours, Meet links, demo types |
| **Demos → All demos** | admin/counsellor | calendar + list, filters, reschedule |
| **My demos** | counsellor | today, join, mark attended/no-show |
| **Lead page → Journey panel** | everyone | what happened (with rule), what's next, Pause/Resume, Skip next step |
| **Follow-up board** | telecaller/manager | due / overdue / done / missed |
| **Journey dashboard** | manager | funnel: leads → called → connected → interested → demo booked → attended → enrolled; drop-off per step; per source/course/counsellor; cost per enrolment (Outpero credits + WhatsApp charges) |
| **Booking page** `/demo/<token>` | lead (public) | pick / reschedule / cancel |

## 8. Data (new collections)

| Collection | Holds |
|---|---|
| `outperocalls` | every post-call delivery (raw + parsed), matched lead, outcome, captured fields |
| `leadjourneyrules` | tenant, order, enabled, event, conditions, actions, stopAfter |
| `leadjourneys` | one per lead: status, current step, paused until, history (action, rule, at, result) |
| `scheduledactions` | due time, lead, action, rule, attempt; picked up by a one-minute job (survives restarts) |
| `demos` (or extend `Meeting` with `kind: 'demo'`) | lead, counsellor, time, Meet link, status booked/confirmed/attended/no_show/cancelled, booking token, reminders sent |
| `democounsellors` | user, hours, days off, length, buffer, Meet link, max/day |
| `leadsequences` + `leadsequenceruns` | sequence steps; per-lead progress |
| `automationpolicies` | tenant policies from §3.4 |

Existing reused: `Lead` (activities, aiCallLogs), `FollowUpReminder`, `WhatsAppTemplate` + sending + 24 h window,
`WhatsAppChatMessage` (replies), Outpero forwarder, Placement booking pattern, Razorpay events, Lost reasons.

## 9. Safety and reliability

- **Quiet hours, daily caps, opt-out, human takeover** enforced in one place (the action runner), not per rule.
- **Idempotent**: each scheduled action has a unique key (lead + rule + step + attempt); re-delivered webhooks and
  restarts never double-send.
- **Two AI callers never on one lead**: Outpero is the caller; the LMS's own AI Call Config is switched off for
  leads in a journey.
- **Every automated message names its rule** in the lead timeline ("sent by rule *No answer — attempt 2*").
- **Kill switch**: Automation on/off per institute; per-rule on/off; per-lead pause.
- **Dry-run**: "test this rule" shows what would happen to a chosen lead without sending.
- **Costs visible**: Marketing templates and Outpero credits are counted on the dashboard (₹ per lead, per enrolment).
- **Consent**: lead forms say "we will call/WhatsApp you"; opt-out honoured immediately.

## 10. Phases

| Phase | Scope | Done when | Size |
|---|---|---|---|
| **0** | Fix WhatsApp chat on the real Lead page; delete the 2 dead lead page copies; course/source clean-up (mapping approved by you) | chat visible on leads; filters reliable | 1½ days |
| **1** | Outpero call results (webhook, match lead, timeline, aiCallLogs, captured fields) · rules engine (events, conditions, actions, scheduler, policies: re-call plan, quiet hours, caps, opt-out, takeover) · 5 starter rules · PDF template header | a test lead: called → outcome → right WhatsApp + re-call scheduled, visible on the lead | 5 days |
| **2** | Demo counsellors, booking page, AI booking + confirm, configurable reminders with Meet link, My demos, attended/no-show, `.ics` | lead books (link or AI), gets every configured reminder, counsellor marks attendance | 5 days |
| **3** | Sequences (post-demo, no-show, nurture) · follow-up status board · outcome capture feeding rules | attended demo → sequence runs and stops on payment | 3 days |
| **4** | Journey panel on the lead · journey dashboard (funnel, drop-off, cost) · rule dry-run | manager sees the funnel; any lead shows why each step happened | 3 days |

Total ≈ 17–18 working days. Each phase ships on its own and is useful by itself.

**Before Phase 1 can start:** in Outpero → Outcomes → Add Webhook, add the LMS URL (given when Phase 1 starts)
and press its test, so the real field names can be confirmed. Meta approval of the templates in §6 runs in
parallel (a few hours to a day each).

## 11. Risks

| Risk | Mitigation |
|---|---|
| Outpero's webhook fields differ from its screen | Phase 1 stores raw deliveries first; mapping fixed from a real one |
| Meta rejects a template (e.g. Marketing wording as Utility) | Drafts follow Meta rules; Marketing where it is promotional |
| Too many messages annoy leads | Daily cap, quiet hours, opt-out, one journey per lead |
| Counsellor forgets to mark attendance | Auto no-show after X min; reminder bell to mark |
| A bad rule messages hundreds of leads | Dry-run, per-rule on/off, global kill switch, rate limit on actions per minute |
| Google Meet link shared publicly | One link per counsellor; rotate from the counsellor screen |

## 12. Open questions

1. Demo length and buffer by default (e.g. 30 min + 10 min)?
2. Can a counsellor take two demos at once (group demo), or always one-to-one?
3. Should leads in "Looking for placements" go into the Placement Program instead of a course demo?
4. Which roles may edit rules — only Tenant Admin, or also a sales manager role?
5. Weekend demos and calls — allowed?
