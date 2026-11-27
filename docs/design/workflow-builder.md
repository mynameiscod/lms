# Workflow Builder — design

**Status:** built on `feature/workflows`, 2026-11-17.
**Ask (owner, 2026-11-17):**
1. Ask a new lead for details on WhatsApp.
2. Reply to their questions.
3. Send demo reminders.
4. Send out-of-office replies.
5. Let admins set up workflows on a screen that looks like Zapier's canvas.

The owner said "need it very badly". This supersedes the parked `lead-journeys.md` for the WhatsApp/rules part. AI calling stays in Outpero; its result is a trigger here.

## Decisions
| # | Question | Decision |
|---|---|---|
| 1 | Separate system (n8n/Zapier) or inside the LMS? | **Inside the LMS.** Every step needs lead data, the WhatsApp window, opt-out and the human-takeover flag, and these already live here. No extra subscription and no second server to secure. A webhook step covers outside tools. |
| 2 | Shape of a workflow | One trigger, then a step tree. A **Paths** step splits into branches. Paths are checked left to right and the first match wins; a path with no conditions catches "everyone else". After a branch ends, the run continues below the Paths step. |
| 3 | Where a run waits | On a step **id**, so live edits are safe. |
| 4 | WhatsApp 24-hour rule | Enforced in one place (`services/workflow/whatsapp.ts`). Questions wait for the person's first message. A message step can fall back to a template. |
| 5 | Loops | Stage changes made by a workflow do not fire "stage changed" workflows. A pass runs at most 60 steps without waiting. |
| 6 | Old bot | Workflows see each WhatsApp message first. When a workflow takes it, the old qualification bot stays quiet. |
| 7 | Opt-out | STOP / UNSUBSCRIBE / START handled once workflows are in use. |
| 8 | Who builds | Admins with `manage_leads`. |

## Triggers and steps
- **Triggers**: new lead (by source), stage changed, WhatsApp message received (any message or keywords; any time, inside or outside office hours), demo booked, demo outcome, AI call result, manual (test).
- **Steps**:
  - Sending: send message, send template, send file, ask question, AI reply.
  - Timing: wait, wait until demo time.
  - Logic: paths.
  - Lead: update lead, assign, follow-up.
  - Team: notify, hand over.
  - Other: webhook, stop.
- **Placeholders**: `{{first_name}} {{name}} {{phone}} {{course}} {{counsellor}} {{counsellor_phone}} {{institute}} {{next_opening}} {{message}} {{demo_time}} {{demo_date}} {{demo_clock}} {{demo_link}} {{answer.<key>}}`.
- **Workflow settings**:
  - send any time, or only in office hours;
  - re-entry, with a cooldown;
  - stop when they reply;
  - also run after a counsellor has taken over the chat;
  - stop at chosen stages.

## Recipes
1. Out-of-office reply
2. New lead: welcome + questions
3. Keyword reply (FAQ)
4. Demo reminders (1 day / 2 hours / 10 minutes)
5. Demo no-show follow-up
6. After the demo (attended)
7. AI assistant
8. Follow-up sequence (stops on reply)

## Cost (Meta India)
- Replies inside the 24-hour window are free.
- Utility template ≈ ₹0.12.
- Marketing template ≈ ₹0.80.
- AI reply ≈ ₹0.10–0.50 per conversation.

## Next
1. Fold CRM Automation, the drips, the source welcome message and the qualification bot into recipes, then retire those screens.
2. Per-step counts on the canvas.
3. Self-serve demo slot booking link (from `lead-journeys.md` Phase 2).
