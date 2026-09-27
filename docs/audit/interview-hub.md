# Interview Hub: Interview Experiences (P1)

**Status:** P1 built on 2026-09-27. P2 to P4 are planned.

## Why it exists
A team failed an interview. A week later the next batch was asked the same questions, because nothing recorded what had been asked in between. The fix depends on speed: capture the questions within 48 hours, approve them within a day, and get them to the next batch before its interview.

## Decisions (user, 2026-09-27)
1. **Global pool.** Published reports are visible to students of every institute. Reports from another institute never show the candidate's name.
2. **Recordings are visible** to students when the candidate consents (the checkbox is on by default and can be unticked). The transcript and structured text are always visible.
3. **The obligation is soft.** One free email reminder goes out two days after an unanswered invite. After three days the invite shows as overdue to the admin. Nothing is blocked.

## What was built
- **Model:** the existing CareerPilot `InterviewExperience` (collection `interviewexperiences`) was extended rather than duplicated. It gains:
  - `rounds[]`, each with `questions[]`, `cleared` and `notes`;
  - `companyName`, `tips`, `eliminationSummary` and `captureMode`;
  - `media` (the Bunny key, transcript and `shareRecording`);
  - `anonymous`, `shareGlobal` (default true), `product`, `inviteId`, `promotedQuestionIds` and `publishedAt`;
  - a `draft` status;
  - `companyId` is now optional, because a report can name a company that no institute has set up yet. Reports are grouped by `companySlug`.

  The existing CareerPilot company stats keep working.
- **New collection:** `interviewexperienceinvites`.
- **Service:** `server/src/services/interviewHubService.ts`.
- **Routes:** `routes/interviewHubRoutes.ts`, served at `/api/v1/interview-hub`.
- **Cron:** `jobs/interviewHubCron.ts` runs hourly and sends the automatic reminders.
- **Capture:**
  - Candidates can type, record a voice note, record a video, or upload a file.
  - For video, the browser also records a separate audio-only track. Whisper's limit is 25 MB and the server image has no ffmpeg, so the audio track is what gets transcribed.
  - `aiComplete` (the cheap default model) turns the notes or transcript into rounds, questions, the result, where people were eliminated, and tips. The candidate corrects the draft before submitting.
  - Recording storage is checked before any paid transcription starts.
- **Review:**
  - The admin can edit anything, send the report back with a note, publish, or unpublish.
  - Publishing awards coins through the existing `experience_approved` rule.
  - "Add to question bank" copies the ticked questions into `companyquestions`. It creates the `Company` in the tenant if needed, and copies each question only once.
- **Reading:**
  - The feed shows all published reports from the global pool, with search (including question text), round and result filters, and a strip of companies.
  - A company page shows the typical round order and the most-asked questions, grouped across reports after normalising the question text, with "asked N×" and the last-asked date.
  - A report page shows a timeline of the rounds and questions, the answer hints, the tips, where people were eliminated, the recording and the transcript.
- **Invites:**
  - An admin can invite by picked students, a batch, or a placement drive's applicants. A drive also pre-fills the company, role and date.
  - Sending is by email (free) or WhatsApp (purpose `INTERVIEW_EXPERIENCE_INVITE`), with a dry run showing the count and ₹ cost.
  - Students who were already invited, or who already posted, are skipped.
  - An invited student sees a "Share now" banner.
  - Submitting a report closes the matching invite.
- **Surfaces:**
  - LMS students: `/interview-experiences` (sidebar: Interview Experiences).
  - CareerPilot: `/careerpilot/interview-experiences` (MemberShell nav). These are the same pages, and they detect which base path they are under.
  - Admin: `/admin/interview-experiences`.

## Tests
- `tests/interviewHub.test.ts` covers how rounds are cleaned.
- A 37-step local smoke test covered:
  - drafts, submitting, sending back and publishing;
  - visibility within the institute and across institutes, anonymity, and turning off global sharing;
  - grouping of repeated questions and the round pattern;
  - search;
  - promotion to the question bank, including that promoting twice adds nothing;
  - invites: the dry run, refusal of WhatsApp-only without a template, skipping people already invited, closing on submit, overdue, reminders and cancelling;
  - the role guards.
- A real AI structuring run turned rough notes into 3 correct rounds with topics, the cleared/eliminated status, and the tips.

## Next
- **P2, question library:**
  - reading modes, including flashcards and "know it / revise";
  - favourites and personal cheat sheets (PDF);
  - official cheat sheets from admins;
  - merging the 4 existing question stores.
- **P3, closing the loop:**
  - automatic invites after a placement drive's date;
  - a prep pack pushed to the next batch before its drive;
  - "Practice this company", combining flashcards, a mock interview and Problem Bank problems;
  - metrics: posting rate, hours to publish, and pass rate before and after.
- **P4, Interview Pilot:** `experiences:read` and `questions:read` scopes on the external API.
- **Known gap:** AI structuring uses the cheap default model and keeps some questions terse, for example "two sum". The candidate edits them. `prefer: 'anthropic'` would give better rewrites at a higher cost.
