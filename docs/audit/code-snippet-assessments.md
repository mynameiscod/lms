# Code Snippet Assessments
**Completion:** 60%  |  **Priority:** P2  |  **Business Impact:** Medium

## Purpose & Business Goal
A "read code, answer questions, explain your reasoning" assessment format. Instructors post a code snippet plus questions (text / MCQ single / MCQ multiple); students answer and MUST write an explanation per question; instructors grade manually. Tests code *comprehension* (not writing) — useful for interviews prep and conceptual mastery. Results are shareable to LinkedIn (portfolio/marketing lever).

## Primary Users & Roles
- **STUDENT** — list published assessments, submit once, view graded result, share to LinkedIn.
- **INSTRUCTOR** — grade submissions (`grade_snippets`).
- **TENANT_ADMIN / INSTRUCTOR** — CRUD + publish assessments (`manage_snippets`).

## Key Files (traced)
- Models: `server/src/models/CodeSnippetAssessment.ts` (81 lines), `CodeSnippetSubmission.ts` (66 lines)
- Controller: `server/src/controllers/codeSnippetController.ts` (310 lines)
- Routes: `server/src/routes/codeSnippetRoutes.ts` (`/api/v1/code-snippets`)
- Client: `client/src/pages/CodeSnippets/AdminCodeSnippets.tsx` (767), `StudentCodeSnippets.tsx` (649), `GradeSubmissions.tsx` (353)
- Client API: `client/src/api/codeSnippetApi.ts`
- Share: `server/src/controllers/shareController.ts` (snippet type), `client/src/components/common/ShareOnLinkedIn.tsx`

## Dependencies & Connected Modules
- **Course/Subject/Chapter/Topic/Batch** — optional scoping refs; `batchIds` empty = all batches.
- **Quiz AI** (`quizApi.generateAIQuestions`) — admin can AI-generate MCQ questions.
- **Certificate/Share system** — LinkedIn share via `shareToken`; cert type `snippet` supported.
- **NOT connected** to `codeRunnerService`/Piston or `assessmentCodeGradingService` (no code execution here).

## Entry / Exit Points
`/api/v1/code-snippets` (auth + tenant):
- Student: `GET /student/list`, `GET /:id/my-submission`, `POST /:id/submit` (one-time).
- Instructor: `GET /:id/submissions`, `POST /submissions/:submissionId/grade`.
- Admin: `GET /`, `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id` (cascade deletes submissions), `POST /:id/publish`.
Exit: LinkedIn share URLs; AI question gen calls quiz service.

## Database Tables & Relationships
- **codesnippetassessments** — tenantId, title, description, language (17-value enum), codeSnippet, questions[{question, type text/mcq_single/mcq_multiple, options[{text,isCorrect}], marks}], totalMarks (auto-sum), course/subject/chapter/topic refs, batchIds[], status draft/published, dueDate, createdBy/updatedBy, timestamps. Index: tenantId.
- **codesnippetsubmissions** — assessmentId→studentId (unique compound = **one submission per student, no retakes**), tenantId, answers[{questionId, selectedOptions[], textAnswer, explanation (required)}], status submitted/grading/graded, grades[{questionId, marksAwarded, feedback}], totalMarksAwarded, overallFeedback, gradedBy/gradedAt, submittedAt, shareToken (sparse). Indexes: assessmentId, studentId, tenantId, shareToken.

## Events / Notifications / Emails / WhatsApp
- **None.** No email/WhatsApp/in-app on publish, due, submit, or grade-ready. `shareToken` enables LinkedIn sharing only.

## AI Features (which model, or "None")
- **AI question generation only** (admin) via `quizApi.generateAIQuestions` (quiz module's model) — generates MCQ-single questions from topic/difficulty/count.
- **No AI grading, no AI evaluation of explanations.** All grading manual.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| AI (via Quiz module) | Generate MCQ questions | Per quiz-module model | Only for authoring, not grading |
| LinkedIn | Social share of graded result | ₹0 | Via shareToken + ShareOnLinkedIn |
| Piston | (available but UNUSED here) | ₹0 | No code execution in this module |

## Validation Rules & Edge Cases
- Create/update: title + codeSnippet required; language in enum; totalMarks auto-computed; empty-string ObjectId/Date fields stripped (BSONError/CastError guard).
- Submit: assessment must exist + be published; blocks duplicate (400 "already submitted"); generates shareToken UUID.
- Grade: manual per-question marks + feedback; sets status graded, computes totalMarksAwarded.
- Batch visibility: `$or: [{ batchIds size 0 }, { batchIds: batchId }]`.
- Explanation mandatory per question — enforced in **UI only**, NOT server-side.
- Grades array not validated against question count (server).
- Due date is informational — no late enforcement.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 70 | Full CRUD + publish + submit + manual grade + cascade delete. Weak server-side validation (explanation, grade count). |
| Frontend/UI | 80 | Strong 3-page UI: 4-tab admin builder, rich student taker + result view, two-panel grading with quick-fill. Good loading/empty/error states. |
| API | 70 | Complete surface, role-guarded. |
| Database | 75 | Denormalized questions, unique 1-submission constraint, share index. Only tenantId indexed on assessments. |
| Automation | 20 | Only MCQ auto could be graded but ISN'T — everything is manual (even MCQ). No notifications. |
| AI | 30 | Question gen only; no AI grading of explanations. |
| Testing | 5 | No tests. |
| **Overall** | **60** | Good manual code-comprehension tool; the name implies auto-execution which does not exist. Automation + notifications are the big gaps. |

## Gaps (mark "Not Implemented")
- **MCQ auto-grading** — even MCQ answers (with `isCorrect` flags) are graded manually; auto-grade NOT wired ("Not Implemented").
- **Code execution / test cases** — no test cases, no Piston; despite "code" name ("Not Implemented" by design).
- **AI explanation grading** — Not Implemented (high-value: Claude could pre-score explanations).
- **Notifications** — publish/due/graded emails or in-app: Not Implemented.
- **Retake / resubmission workflow** — hard one-per-student; no instructor override ("Not Implemented").
- **Plagiarism / similarity** on explanations — Not Implemented.
- **Analytics / dashboard widgets** — no completion-rate or item-analysis ("Not Implemented").
- **Rubric grading** — free-form marks only.
- **Bulk grade / CSV export** — Not Implemented.
- **Server-side validation** of mandatory explanation + grade array — Not Implemented (UI-only).
- **Automated tests** — Not Implemented.

## Technical Debt / Performance / Security / Scalability
- MCQ correctness is known server-side yet unused — wasted automation and instructor time.
- Server trusts UI validation (explanation, grade count) — a crafted request bypasses required fields.
- Only `tenantId` indexed on assessments; student-list queries filter by batch/status unindexed.
- No due-date enforcement — students can submit indefinitely.

## Suggestions & AI Opportunities
- Auto-grade MCQ portions instantly; leave only text/explanations for humans.
- Add Claude explanation-scoring + suggested feedback (instructor accepts/edits) — big grading-time saver, aligns with product Anthropic stack.
- Add publish/graded notifications (reuse assignment email/notification infra).
- Server-side validation; item-analysis analytics; CSV export.
- Optional per-question retake toggle.

## Estimated Dev Effort
- MCQ auto-grade + server validation: ~2 dev-days.
- Claude explanation-scoring assist: ~4–5 dev-days.
- Notifications + analytics + export: ~4 dev-days.
- Retake workflow + tests: ~3 dev-days.
- **Total to ~90%: ~2–3 weeks.**
