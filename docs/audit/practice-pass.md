# Practice Pass (Daily Practice → Placement Eligibility)
**Completion:** 70%  |  **Priority:** P0  |  **Business Impact:** Very High

## Why
Production data from 2026-09-27, covering 117 LMS students over the last 30 days (25 working days):
- 38% did nothing at all.
- 8% did even one Communication Lab session.
- 24% did any Thinking Lab work.
- 32% submitted any assignment.
- 0 students did communication, thinking and coding on the same day, even once.

Students then fail easy interview questions. Nothing depended on practice, so nobody practised.

## What it does
- **Daily tasks.** An admin sets the tasks due every working day, as counts of each type: Communication Lab, coding problem, assignment, Thinking Lab. A day on which every required task is done is a **practice day**.
- **Practice attendance** is the share of practice days over a rolling window (default 30 days).
- **Placement hold.** Falling below the threshold (default 80%) puts the student on **automatic placement hold**.
- **Where rules are set.** Rules are set at three levels: institute default, then batch override, then student override. A student override can also exempt the student.
- **What gets computed** comes only from records the labs already write:
  - A Communication Lab session counts if it is completed, evaluated and at least 20 seconds long.
  - A coding problem counts if the `problemsubmissions` entry passed at least one test.
  - An assignment counts if the submission reached a submitted state.
  - A Thinking Lab day counts if the `dailychallenges` entry is submitted or solved.
- **Excused days:**
  - Batch weekly offs, holidays and special days.
  - Approved leave requests.
  - Days before the institute switched the pass on.
  - Days before the student joined the batch.

  Today only counts once it is met, so a student is not "missing" a day that is not over.
- **Enforcement:**
  - A grace period (default 7 days) before holds start.
  - A new student needs at least 5 counted days before a hold can apply.
  - Holds block `applyToDrive`, admin "shortlisted" (single and bulk CSV), publishing a Candidate Proof profile, and adding a student as a placement-partner candidate.
  - Recording an actual outcome (selected, placed, rejected) is still allowed.
- **Schedule:**
  - Every hour, standings are recomputed for every institute that has the pass switched on (`jobs/practicePassCron.ts`).
  - The automatic 7 PM IST WhatsApp reminder is **off by default** because every message costs money. An admin can switch it on under Rules; it also needs the `PRACTICE_REMINDER` template assigned under Admin → WhatsApp Templates → Where used.
- **Admin-sent reminders:**
  - The "Send reminder" button on `/practice-pass` opens a form with four choices:
    - Who: tasks left today, missed yesterday, below threshold, or on placement hold.
    - Which batch.
    - Channel: Email, which is free.
    - Channel: WhatsApp, which is priced.
  - A dry run shows the recipient count, who has a phone, the ₹ estimate, and a sample of students with the tasks they have left. Nothing is sent until the admin confirms.
  - WhatsApp is sent through `services/purposeMessaging.ts`. It refuses when the purpose has no template of its own and never falls back to the notify template.
  - The cost is set by `WHATSAPP_COST_PER_MESSAGE_INR` (default ₹0.13 for Utility).
  - Every send is logged in `practicereminderlogs` with per-channel sent and failed counts. These appear on the Reminders tab.
- **Weekly report:**
  - The weekly learning report email has a "🔥 Daily Practice" section: a 7-day ✓/✗/– strip, practice attendance against the threshold, the streak, and the hold status.
  - The Weekly Reports page shows a Daily Practice column.
  - Reports can be sent by Email, WhatsApp or both. WhatsApp uses the `WEEKLY_REPORT` template with 5 variables. The page shows a cost estimate for WhatsApp. Each channel is logged separately in `weeklyreportlogs.channel`.

## Key files
- Models: `models/PracticePass.ts` → collections `practicepolicies`, `practicedays` (unique on studentId + date), `practicestandings`.
- Engine: `services/practicePassService.ts`, which provides `resolve`, `recompute`, `placementHoldReason`, `myPractice`, `standings`, `savePolicy`, `enable`/`disable`, and `pendingToday`.
- API: `routes/practicePassRoutes.ts` at `/api/v1/practice-pass`.
  - `/me` for students.
  - `/admin/*` for staff. `enable`/`disable` require institute admin.
- UI:
  - The Today's practice card on the student dashboard (`components/practice/PracticeTodayCard.tsx`).
  - `/my-practice`, a calendar view.
  - `/practice-pass` for admins: standings (summary tiles, filters for batch/missed/on hold, CSV export, per-student calendar) and rules (institute, batches, individual exceptions).
- Tests: `tests/practicePass.test.ts` (rule merging). A 24-step local API smoke test covered holds, leave, weekly offs, exemption, overrides, the placement block, and switching off. A 21-step smoke test covered reminders and weekly-report channels:
  - auto-reminders off by default;
  - role guard;
  - the dry-run count and ₹ estimate;
  - refusal when there is no template;
  - the history log;
  - the weekly estimate;
  - the practice section in the email;
  - one log per channel.

## Gaps
- Anti-gaming beyond the minimums: assignment quality, Thinking Lab effort, and plagiarism checks.
- A mentor morning digest (email or WhatsApp) of who missed yesterday.
- A weekly parent report, which could reuse the weekly report's channels.
- A "Selected students" reminder picker from the standings table. The API already supports `audience: 'selected'`.
- Actual WhatsApp spend from Meta's billing. The page shows only an estimate.
- Auto-assigning one daily coding problem per batch from the Problem Bank. Today admins create problem sets manually.
- Manual class attendance is still separate by design.
