# Career Profile / CareerPilot Review
**Completion:** 80%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
The "CareerPilot review": AI reviews a student's three placement pillars — Resume, GitHub, LinkedIn — against a target role, returning a 0-100 score per pillar, prioritised issues (with fixes + severity), improved/rewritten content, and (for GitHub/LinkedIn) a recruiter-facing health checklist. Includes a trainer review workflow (draft → submitted → in_review → reviewed → completed) so instructors can vet/edit the AI output before it reaches the student. Directly supports placement outcomes.

## Primary Users & Roles
- **STUDENT** — one profile per user+tenant; sets target role + GitHub URL + LinkedIn pasted text; runs the review; regenerates individual sections.
- **TENANT_ADMIN / INSTRUCTOR (trainer)** — lists/filters all profiles, drills into one, edits improved content, regenerates pillars/sections, records reviewer notes, sets status (Admin.tsx dashboard).

## Key Files (traced)
- Model: `server/src/models/CareerProfile.ts` (84 lines) — 3 embedded `IPillarReview` (resume/github/linkedin) + workflow state; unique `{tenantId, studentId}`; index `{tenantId, status}`.
- Routes: `server/src/routes/careerProfileRoutes.ts` — 10 endpoints (4 student, 6 admin).
- Controller: `server/src/controllers/careerProfileController.ts` (188 lines).
- Service: `server/src/services/careerReviewService.ts` (265 lines) — `reviewResume`, `reviewGithub`, `reviewLinkedin`, `regenerateSection`, GitHub fetch + deterministic checklist.
- Client: `client/src/pages/CareerProfile/{index.tsx (student), Admin.tsx (trainer), parts.tsx (ScoreCards/IssuesList/ImprovedView/GithubChecklist + markdown export), CareerProfile.css}`.

## Dependencies & Connected Modules
- **Resume Builder** — `reviewResume()` reads the student's latest `Resume` doc; links `resumeId`.
- **StudentProfile** — supplies GitHub OAuth token (`oauthConnections.github.accessToken`) for higher GitHub API rate limits.
- **GitHub REST API** — profile, repos, READMEs, file tree (native `fetch`, no SDK).
- **aiClients / settingsService** — Claude→OpenAI selection.

## Entry / Exit Points
- Entry: `/career-profile/my` (student) and `/career-profile` (admin list).
- Exit: markdown export (`downloadMarkdown` in parts.tsx); improved content consumed manually by the student (copy into resume/LinkedIn). No auto-push back into Resume Builder.

## Database Tables & Relationships
- `careerprofiles` — `tenantId → Tenant`, `studentId → User` (unique compound), `batchId → Batch`, `resumeId → Resume`, `reviewedBy → User`. Three embedded pillar reviews (`score`, `issues[]`, `improved` mixed, `checklist[]`, `reviewedAt`). Status enum + reviewer fields + `lastReviewRunAt`.

## Events / Notifications / Emails / WhatsApp
- **None.** Student is not notified when a trainer completes their review; trainer is not notified when a student submits. Significant workflow gap.

## AI Features
| Pillar | Provider / Model | Purpose |
|---|---|---|
| Resume review | Claude (`INTERVIEW_AI_MODEL`, default `claude-sonnet-4-6`) → OpenAI (`OPENAI_MODEL`) fallback | ATS score + issues + improved summary/skills/bullets, grounded in saved Resume |
| GitHub review | Same Claude→OpenAI + **GitHub REST API** (deterministic 8-point checklist computed in code, not AI) | Score + issues + improved bio/profile-README/repo suggestions/activity tips/post ideas |
| LinkedIn review | Same Claude→OpenAI | Score + issues + 8-point checklist + improved headline/about/skills/bullets/post ideas/4-week content plan |
| Section regenerate | Same Claude→OpenAI | Re-generate one section of improved content, matching its data type |

Reviews run in parallel via `Promise.allSettled`; a failed pillar records a score-0 "Review failed" issue rather than crashing the whole run.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| GitHub REST API | Profile/repos/README/tree | Free | 60 req/hr unauth, 5,000/hr with OAuth token; token optional per student |
| Anthropic Claude Sonnet 4.x | 3 pillar reviews + regen (2,200–2,600 out tokens each) | ~₹250 / 1M in, ~₹1,250 / 1M out | Full review ≈ ₹8–15/run (3 pillars) |
| OpenAI GPT-4o-mini | Fallback | ~₹12–15 / 1M in, ~₹50 / 1M out | Only if no Anthropic key |
| LinkedIn | — | ₹0 | NO API/scraping — student pastes text manually |

## Validation Rules & Edge Cases
- GitHub username parsed from URL or raw handle (`parseGithubUsername`); GitHub 404 surfaced as friendly error.
- LinkedIn requires ≥20 chars pasted, else score-0 issue.
- Resume review returns "No resume found" issue if student hasn't built one.
- Admin edits `improved` via raw JSON textarea (no schema validation of pasted JSON).
- Gaps: no URL validation on githubUrl/linkedinUrl; no OAuth token freshness check (silently drops to public rate limit); `regenerateSection` passes arbitrary section name to AI unvalidated; no GitHub API rate-limit handling.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 88 | All 3 pillars + regen + admin workflow; robust allSettled + deterministic GitHub checklist |
| Frontend/UI | 82 | Student builder + trainer dashboard + tabs + checklists + per-section redo + markdown export |
| API | 85 | Full student + admin surface; no notifications/analytics endpoints |
| Database | 85 | Clean unique index + workflow states; `improved` is untyped Mixed (flexibility vs. validation) |
| Automation | 5 | Manual trigger only; no scheduled re-review; no notifications |
| AI | 90 | 3 grounded pillar reviews + regen; GitHub grounded on real READMEs/tree |
| Testing | 0 | No tests |
| **Overall** | **80** | Strong, deployed (Phases 1+2 per memory); main gaps = notifications, LinkedIn API, automation, tests |

## Gaps (Not Implemented)
- **Features:** No LinkedIn OAuth/import (manual paste only); no auto-apply of improved content into Resume Builder; no score history/trend; no bulk trainer review.
- **APIs:** No notification triggers; no analytics (avg pillar scores by batch, review-turnaround time).
- **Validation:** URL formats, OAuth token freshness, GitHub rate-limit backoff, admin JSON-paste validation — all absent.
- **Automation:** No scheduled re-review; no reminder to students to run/update; no trainer queue notifications.
- **Notifications:** None (student not told review is ready; trainer not told of new submissions).
- **Reports/Dashboard widgets:** Admin list is a filterable table only — no aggregate dashboard.
- **Analytics:** No pillar-score distribution, no improvement tracking.
- **Security:** All 10 endpoints share only auth+tenant middleware — student vs admin separation is by convention (path + client), no explicit role guard on admin routes (e.g., a student could call `GET /career-profile/` list). **Privilege gap to verify/fix.**
- **Audit logs:** No audit trail on trainer status changes / improved-content edits.
- **UX / Error / Loading / Empty states:** Present in pages; error surfaced via banner.
- **Mobile:** Not verified.

## Technical Debt / Performance / Security / Scalability
- **Security:** Admin routes lack an explicit `roleGuard` — relies on the frontend not exposing them. Compare with Communication/Resource/Speaking which use `roleGuard`. Recommend adding role checks.
- LinkedIn "review" is text-parse of pasted content — fragile and easily gamed.
- Synchronous multi-pillar AI call can take 30–60s; no async/queue, request blocks.
- GitHub calls not cached — re-running review re-fetches everything.

## Suggestions & AI Opportunities
- Add role guard to admin endpoints; add student/trainer notifications on submit/complete (infra already exists).
- Push "improved" resume content directly into the Resume Builder record (one-click apply), closing the loop with the Resume module.
- Cache GitHub fetches; add rate-limit backoff.
- AI opportunity: auto-generate the profile README straight to the user's GitHub via existing Octokit push (Code Playground already uses Octokit); LinkedIn OAuth import; batch-level "placement readiness" heatmap for trainers.

## Estimated Dev Effort
- Role guards + notifications + analytics dashboard: ~4 dev-days.
- Resume auto-apply + GitHub caching/backoff: ~3 dev-days.
- LinkedIn OAuth import: ~4–5 dev-days (OAuth complexity).
- Tests: ~2 dev-days. **Total to "92%": ~2.5–3 weeks.**
