# Student Progress & Personalization
**Completion:** 68%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
Two intertwined capabilities: (1) **Progress tracking** — `StudentProgress` records course/subject/chapter-level completion, video-watch duration, quiz/assignment status, streaks, and time; the newer day-wise progress lives on `CurriculumEnrollment` (completedDays/items, xp, streak). (2) **Personalization** — the CareerPilot funnel clones a mentor master-track into a candidate-specific curriculum, resizing each topic by assessment scores (drop mastered / compress strong / expand weak), then lazily AI-generates each day's content on first open. This is the differentiated "AI personal learning plan" that drives the paid funnel.

## Primary Users & Roles
- **STUDENT** — progress accrues as they learn; personalized track auto-built from their assessment.
- **INSTRUCTOR / TENANT_ADMIN** — seed master-tracks; monitor cohort progress (CohortProgress).
- **System** — `assessment-personalizer` / `ai-day-gen` service identities.

## Key Files (traced — real paths)
- Models: `server/src/models/StudentProgress.ts` (165), `DayPlan.ts` (81, aiGenStatus state machine), `CurriculumEnrollment.ts` (progress fields)
- Routes: `server/src/routes/progressRoutes.ts` (25)
- Controller: `server/src/controllers/progressController.ts`
- Services: `server/src/services/progressService.ts` (294), `dayContentGeneratorService.ts` (205), `lessonAIService.ts` (230), `trackPersonalizationService.ts` (165)
- AI infra: `server/src/services/aiClients.ts` (Claude/Anthropic), `settingsService.ts`
- Client: `client/src/pages/CohortProgress/index.tsx` (87)

## Dependencies & Connected Modules
- **Curriculum & Content Library** — personalization clones LearningCurriculum + inserts DayPlan skeletons; day gen writes LearningContentLibrary + InteractiveLesson.
- **Enrollment & Learning Plans** — `ensureDayContentGenerated` fired from `getStudentDayPlan`; progress surfaced in journey/summary.
- **Assessment funnel** — `AssessmentSubmission.subScores` drive `resizeTopics`; `findMasterTrackForCandidate` matches by role+level.
- **Interactive Lessons / Quiz / Assignment** — StudentProgress references QuizAttempt/Submission.
- **Piston** (DSA practice verification) + **Claude** (lesson/QA generation).

## Entry / Exit Points
- `GET /progress/course/:courseId`, `GET /progress/course/:courseId/completed-chapters`, `POST /progress/chapter/:chapterId/complete`, `GET /progress/chapter/:chapterId/status` (auth+tenantResolver, **no roleGuard**).
- Personalization is invoked internally by the assessment funnel (`personalizeTrackForCandidate`), not via a public route.
- Day gen invoked internally on day open (`ensureDayContentGenerated`).

## Database Tables & Relationships
- `studentprogresses` — unique `(userId,courseId)`; `(userId,batchId)`, `(tenantId,courseId)`, `(batchId)`. Deeply nested subject/chapter arrays.
- `dayplans` — `aiGenStatus` idle/generating/done/error with atomic claim + stale-retry (3 min).
- Personalized `learningcurriculums` — `clonedFrom` + `personalizedFor` (idempotent per master+student).

## Events / Notifications / Emails / WhatsApp
- None on progress milestones. Day-gen writes an error state on failure but no alert. Streak updates are silent.

## AI Features (which model, or "None")
- **Lazy day-content generation** (`dayContentGeneratorService`) — **Claude** (`getAnthropic`): default `claude-sonnet-4-6` for the interactive lesson (`generateLesson`), `INTERVIEW_AI_MODEL` (default Sonnet 4.6) for 3-item tech Q&A; DSA practice via `assessmentQuestionGeneratorService.generateItems` with Piston-verified test cases. Concurrency-safe atomic claim; canonical de-dup reuses the first generated set across candidates (major cost saver).
- **Track personalization** (`trackPersonalizationService`) — rule-based (not AI): score ≥90 drop, ≥75 compress ×0.5, ≤40 expand ×1.5; re-lays day numbers; inserts DayPlan skeletons with placeholder notes.
- No AI fallback to OpenAI in the day-gen path (hardcoded Anthropic) even though `aiGateway` supports it.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| Anthropic Claude | Lesson + Q&A generation on day open | Sonnet ~₹250/₹1250 per M in/out; ~₹3–8 per personalized day | De-duped across candidates; cost tracked in `AiUsage` |
| Piston (self-hosted) | Verify DSA practice test cases | ₹0 | Best-effort; failures logged, not surfaced |

## Validation Rules & Edge Cases
- `getOrCreateProgress` requires an existing Enrollment; builds subject/chapter skeletons.
- Personalization idempotent (reuses existing clone); non-dimension topics always kept.
- Day-gen: atomic `findOneAndUpdate` claim on `items:{$size:0}` + status; stale 'generating' >3 min retried.
- **Edge/gaps:**
  - **Streak logic is timezone-naive** (`markChapterComplete`) — day-boundary comparison can mis-reset across UTC midnight.
  - `StudentProgress.totalTimeSpent` is defined but never written (dead field).
  - N+1 in `getOrCreateProgress` (subjects → chapters loop).
  - Day-gen marks `error` immediately on quota/empty — no backoff/retry; student sees error state.
  - Fixed personalization thresholds (90/75/40) not tenant-tunable.

## Completion Breakdown
| Dimension | % | Reasoning (from actual code) |
| Backend | 82 | Robust progress service + concurrency-safe day gen + clean personalization; N+1 + timezone + dead-field debt |
| Frontend/UI | 30 | Only CohortProgress list (87 lines); no student progress drill-down UI (day-wise progress shown via Enrollment module instead) |
| API | 72 | Legacy chapter-progress endpoints; personalization/day-gen are internal, not REST |
| Database | 85 | Good indexes; deeply nested StudentProgress arrays are heavy to update |
| Automation | 70 | Lazy gen + de-dup + atomic claim are strong; no milestone events, no retry/backoff |
| AI | 80 | Claude lesson+QA+DSA gen working & cost-optimized; no OpenAI fallback, fixed thresholds |
| Testing | 15 | `planSchedule.test.ts` exists; no tests for progressService/personalization/day-gen |
| **Overall** | **68** | Strong AI personalization backbone; weak on student-facing progress UI, resilience, and tests |

## Gaps (mark "Not Implemented" where absent)
- **Features:** Student progress drill-down UI — Not Implemented. Mastery tagging / spaced repetition — Not Implemented.
- **APIs:** Enrollment-level progress + cohort leaderboard endpoints — Not Implemented (partial via Enrollment module).
- **Validation:** Timezone-correct streaks — Not Implemented; `totalTimeSpent` write — Not Implemented (dead field).
- **Automation:** Day-gen retry/backoff on AI quota — Not Implemented; milestone/streak notifications — Not Implemented.
- **Notifications:** None.
- **Reports/Analytics:** Learning-velocity / at-risk prediction — Not Implemented.
- **AI:** OpenAI fallback in day-gen — Not Implemented; per-tenant threshold tuning — Not Implemented.
- **Security:** progress routes lack roleGuard (student writes own progress; no ownership check beyond tenant/user in controller).
- **Audit logs:** None.

## Technical Debt / Performance / Security / Scalability
- N+1 in progress hydration and deeply-nested arrays make StudentProgress updates costly at scale — consider flattening or event-sourced progress.
- Day-gen has no graceful degradation if Claude is down → students blocked on "error"; add fallback/retry.
- Two progress stores (StudentProgress course-wise vs CurriculumEnrollment day-wise) — conceptual duplication.

## Suggestions & AI Opportunities
- Fix streak timezone (use IST anchor) and write `totalTimeSpent` from heartbeats.
- Add day-gen retry with backoff + OpenAI fallback via `aiGateway`.
- Build a student progress dashboard (mastery heatmap by topic dimension).
- AI opportunity: adaptive re-personalization mid-course (re-score from recent quiz/lesson performance and resize remaining topics); at-risk churn prediction; personalized daily catch-up plan.

## Estimated Dev Effort
- Streak/timezone + totalTimeSpent + N+1 cleanup: **1 week**.
- Day-gen resilience (retry/backoff/fallback): **3–4 days**.
- Student progress UI + analytics: **2 weeks**.
- Adaptive re-personalization: **2 weeks**.
