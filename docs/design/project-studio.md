# Project Studio — guided end-to-end projects

Status: DESIGN (not built). Owner decisions taken 2026-11-27.

## Why

Most students start the course project but never finish it. Project Studio gives every
student an admin-defined project broken into small daily tasks, run like an agile job:
own GitHub repo, a branch + PR per task, a task board, checks, and interview questions on
what each task taught. Completion % feeds the placement decision.

## Owner decisions (2026-11-27)

| # | Question | Decision |
|---|---|---|
| 1 | Solo or team | **Solo** |
| 2 | Pacing | **Self-paced** (optional target date only, no batch calendar) |
| 3 | Tech stack | **Fixed by the admin per project** |
| 4 | Finish before placement? | **Completion % per student; the admin picks who goes to placement** (optional per-batch minimum % as a guide/hold) |
| 5 | Who writes projects | **Admin** (Claude can generate a draft the admin edits) |

## Structure

```
ProjectTemplate (admin)           e.g. "Clinic Appointment System" · Spring Boot + React
 └─ Sprint (≈ week)               Sprint 1 Setup & Auth
     └─ Day                       Day 3 Login API
         └─ Task (user story)     "As a user I can log in and receive a JWT"
             ├─ brief, steps, hints, starter snippets
             ├─ acceptance criteria (checklist)
             ├─ proof required: commit | PR merged | screenshot | URL | video
             ├─ weight (for completion %)
             └─ interview question tags → Interview Hub question library
```

**Resume problem:** all students on one project = identical resumes. So:
- Admin writes a **skeleton** once (register → login → roles → CRUD → search → reports →
  deploy) and publishes **domain variants** of it (Clinic, Hostel, Gym, Library, Inventory…).
- **Pick cap per batch** per project (e.g. max 5), so classmates differ.
- Last sprint always holds an **"own feature"** task the student designs.

## Student flow

1. Browse catalog (only projects released to their batch) → pick one (one active project at a time).
2. **Connect GitHub** → **create repo in one click** from the project's starter template.
3. LMS creates one GitHub **Milestone per sprint** and one **Issue per task** in that repo.
4. Per task: read brief → LMS shows the git commands (`git checkout -b feature/login-api` …)
   → code locally in VS Code → commit `Closes #7` → PR → merge.
5. GitHub webhook → LMS marks progress → checks run → task goes *In review* / *Done*.
6. Interview questions for the task unlock → student answers (self-check, later AI-scored).
7. End of sprint: short demo (video or deployed URL) + one-line retro.

Code is written **locally, not in the browser** — local git is what employers test; a
full-project web IDE is out of scope. The existing Code Playground stays for snippets.

Agile pieces: task board (To do / In progress / In review / Done), daily stand-up
(yesterday / today / blocker — blockers alert the mentor), sprint review, retro.

## Checking a task (cheapest first)

1. **Automatic** — expected files exist, PR merged, admin-written tests pass in the GitHub
   Actions workflow shipped in the starter repo (result reported back via webhook).
2. **AI review** — Claude reviews that task's diff like a senior on a PR.
3. **Mentor** — only at sprint reviews.

Tasks whose proof is "manual" (screenshot/URL) go to a mentor review queue.

## Completion % and placement

- `completion % = sum(weight of Done tasks) / sum(all task weights)` for the student's project.
- Shown on: student's project page, admin batch dashboard, student details, weekly report.
- Admin **Placement pick list**: students sorted by %, filter "≥ X %", tick to release to placement.
- Optional **per-batch minimum %**: below it, `placementHoldReason()`
  (server/src/services/practicePassService.ts) returns a hold, same mechanism Practice Pass
  uses, so drive shortlisting already respects it. Off by default.

## GitHub integration

Already exists: GitHub OAuth in server/src/controllers/oauthController.ts, keys in Platform
Settings (OAuth group), Octokit push in the Code Playground.

Changes needed:
- Current scope is `user:email repo` (full access to ALL private repos). Narrow to
  **`user:email public_repo`** — project repos are public anyway for resumes. Verify the
  Playground push still works with the narrower scope.
- Store the token encrypted (note: ENCRYPTION_KEY is still the weak literal — fix first or alongside).
- Repo webhook (push, pull_request, workflow_run) → `/api/v1/project-studio/github/webhook`,
  HMAC-verified with a per-repo secret.
- Check GITHUB_CALLBACK_URL in prod points at platform.codebegun.com, not the localhost default.

## Data model (new collections)

- `projecttemplates` — tenant, title, domain, stack, level, skeletonId?, starterRepo,
  sprints[] → days[] → tasks[] (embedded; ids stable), pickCapPerBatch, releasedToBatches[], status draft/published.
- `projectenrollments` — student, template, repo {owner, name, url, webhookId}, task states
  [{taskId, status, issueNo, prUrl, checks, proof, reviewedBy, doneAt}], standups[], sprintReviews[],
  completionPct (denormalised), startedAt, targetDate?, completedAt.
- Existing `ProjectPlan` (AI per-student plan for CareerPilot) stays separate.

## Phases

| Phase | Ships |
|---|---|
| **P1** | Admin builder (sprints/days/tasks/interview tags, weights) + release to batches + student catalog/pick + day-wise task view + manual proof (commit/PR link) + mentor tick + completion % + admin progress dashboard + self-check interview Qs + Practice Pass task type |
| **P2** | Connect GitHub (narrowed scope), one-click repo from template, auto Issues/Milestones, webhook progress |
| **P3** | GitHub Actions checks + AI diff review + task board + stand-ups + sprint reviews |
| **P4** | Skeleton → domain variants + pick caps + own-feature task + placement pick list & optional hold + Career Profile + weekly report + "no commit in 3 days" WhatsApp (via whatsAppAudiences registry) |

## P1 as built (branch feature/project-studio)

- API `/api/v1/project-studio` (server/src/routes/projectStudioRoutes.ts, services/projectStudioService.ts,
  models/ProjectStudio.ts). Pages: admin `/admin/project-studio` (Projects · Student progress · Review),
  student `/my-project`. Permission `manage_project_studio`; student switch `myProject` (Student Features / batch Modules).
- Interview questions are written **on each task** (question + model answer) rather than linked from the
  Interview Hub library — the library is spread over several older stores; linking can come later.
  Answers are not sent to the student until they submit the task.
- Per project, the admin picks **"a mentor approves each task"** (default) or **"done as soon as submitted"**.
- Anti-copy: commit/PR proof must be inside the student's own repo; two students cannot register the same repo.
- Admin **Copy** duplicates a project with fresh ids — the quick way to make domain variants before P4.
- Practice Pass: new task type `project_task` (default 0 → no change until an admin requires it). Each task
  submitted on a day counts once for that day.

## Further decisions (2026-11-27)

- **No project switching** once a student has picked. Only an admin can reset/reassign.
- **Interview answers are self-check** at first; AI scoring comes later (P3+).
- **Project work counts as Practice Pass activity**: a task moved to Done (or a reviewed
  submission) that day counts toward the student's practice attendance — add it as a
  Practice Pass task type.
