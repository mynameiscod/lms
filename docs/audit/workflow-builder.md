# Workflow Builder
**Completion:** 75%  |  **Priority:** P1  |  **Business Impact:** High  |  **State:** built and tested on `feature/workflows` (2026-11-17), not deployed

## Purpose & Business Goal
The admin builds WhatsApp and lead automations on a Zapier-style canvas instead of asking for code. It covers the owner's five asks:
1. Ask for details on WhatsApp when a lead arrives.
2. Reply to their questions: keywords, or AI with hand-over to a person.
3. Send demo reminders.
4. Send out-of-office replies.
5. Build workflows inside the LMS, with no separate system.

Design: `docs/design/workflow-builder.md`.

## Users & Access
- Admins (SUPER_ADMIN / TENANT_ADMIN) with `manage_leads` use **CRM → Workflows** (`/workflows`, `/workflows/:id`).
- The API is `/api/v1/workflows/*`, behind `roleGuard(['manage_leads'])`.

## Key Files
- Models: `server/src/models/Workflow.ts`.
  - **Workflow**: trigger plus a step tree.
  - **WorkflowRun**: one person in one workflow, with the step they wait on, answers and log.
  - **WorkflowSettings**: office hours and holidays.
  - `WhatsAppThread.automationOptOutAt` holds the STOP opt-out.
- Engine: `server/src/services/workflow/`.
  - `engine.ts`: fire, run, onInbound, demo hooks, resumeDue.
  - `shape.ts`: tree cleaning, navigation, checks before switching on.
  - `logic.ts`: conditions, placeholders, keyword and option matching.
  - `officeHours.ts`.
  - `whatsapp.ts`: every send, the 24-hour rule, logging.
- Job: `server/src/jobs/workflowCron.ts`, every minute, job-runner process only.
- Routes: `server/src/routes/workflowRoutes.ts`.
- Hooks into existing code:
  - `Lead` post-save (new lead)
  - `leadLifecycleService.changeStage` (stage changed; not for `source: 'automation'`)
  - `outperoCallService` (call result, and stage moves by the AI call)
  - `meetingController.createMeeting` and `leadDemoService.recordMeetingOutcome` (demo booked, moved, attended, no-show)
  - `whatsappWebhookController`: workflows see each message before the old qualification bot. If a workflow handled it, the bot stays quiet.
- Client: `client/src/pages/Workflows/`.
  - `index.tsx`: list, recipes, Runs, Office hours.
  - `Builder.tsx`: canvas.
  - `editors.tsx`: side panel.
  - `meta.ts`: catalogue and recipes.
  - `tree.ts`, `Runs.tsx`.
  - API client: `client/src/api/workflowApi.ts`.

## How It Works
- A trigger starts one run per matching active workflow.
- A run executes steps until it must wait for a timer or for a reply.
- Waiting runs are continued by the minute job. A reply resumes them from the webhook.
- A run is claimed atomically, by a status change from `waiting` to `running`. A run left locked for 10 minutes is requeued.
- A run stores the **id** of its step, not its position. Editing a live workflow is therefore safe: a run whose step was deleted stops with a reason.
- Dedupe uses a unique index on (workflowId, dedupeKey):
  - once per person, unless re-entry is allowed (then there is a cooldown, and never two live runs);
  - one run per demo time;
  - one run per demo outcome.
- Meta's 24-hour rule:
  - Free text, buttons, lists and files are only sent inside the window.
  - A "send message" step can fall back to a template.
  - "Ask a question" waits for the person to message first.
- Opt-out:
  - STOP or UNSUBSCRIBE stops their runs and blocks every later workflow message. START undoes it.
  - Do-not-contact leads are skipped too.
- Keyword workflows win over catch-all "any message" workflows. Out-of-office replies still go out.
- A demo that is moved restarts its reminders. A reminder whose time has already passed is skipped, never sent late.

## Tests
- `server/src/tests/workflowLogic.test.ts` (14 tests): office hours across nights, holidays and Sunday; the tree; conditions; placeholders; keywords, including Telugu; options.
- `server/src/tests/integration/workflows.int.test.ts` (6 tests, real Mongo):
  - welcome, then a question that waits for the first message, a wrong answer re-asked, and a branch on the answer that updates the lead and creates a follow-up;
  - a timeout;
  - keyword precedence and the out-of-office cooldown;
  - STOP and START;
  - a demo moved, then reminder, then no-show;
  - a live edit.
- `client/src/pages/Workflows/workflows.smoke.test.tsx` (3 tests): every step type, recipe and branch renders, and every editor opens.

## Gaps / Next
- The older automations are still separate and can double-message if both are on:
  - CRM Automation rules
  - WhatsApp drip sequences
  - the Lead Sources welcome message
  - the Qualification Questions bot

  The builder warns about this. They should move into recipes, and the old screens should then be retired.
- There is no visual run-through on the canvas (counts per step). Run history is a table.
- Demo booking by the lead from a link (self-serve slots) is not built. Demos are still booked by counsellors.
- AI reply uses `aiGateway` (OpenAI first, Claude as fallback). Cost is logged under module `workflow_ai_reply`.
- No one has clicked through the canvas in a real browser yet.
