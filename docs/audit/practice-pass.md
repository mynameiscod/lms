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
  - At 7 PM IST a WhatsApp reminder goes to students with tasks left. This only happens if the `PRACTICE_REMINDER` template is assigned under Admin → WhatsApp Templates → Where used.

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
- Tests: `tests/practicePass.test.ts` (rule merging). A 24-step local API smoke test covered holds, leave, weekly offs, exemption, overrides, the placement block, and switching off.

## Gaps
- Anti-gaming beyond the minimums: assignment quality, Thinking Lab effort, and plagiarism checks.
- A mentor morning digest (email or WhatsApp) of who missed yesterday.
- A weekly parent report.
- Auto-assigning one daily coding problem per batch from the Problem Bank. Today admins create problem sets manually.
- Manual class attendance is still separate by design.
