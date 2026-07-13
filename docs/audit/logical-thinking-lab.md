# Logical Thinking Lab

**Completion:** 72%  |  **Priority:** P2  |  **Business Impact:** Medium

## Purpose & Business Goal
Daily adaptive "think-before-you-code" challenges with AI rubric evaluation (10 dimensions), voice explanation scoring, a rolling thinking-profile, and rich gamification (XP/levels/coins/badges/streaks/leaderboards). Drives daily engagement.

## Primary Users & Roles
STUDENT (solve, voice, journal, analytics); INSTRUCTOR/ADMIN (problem bank, generate, schedule, analytics). Admin endpoints roleGuard(`create_courses`,`edit_courses`,`manage_own_courses`,`manage_tenant`).

## Key Files (traced)
- Models: `ThinkingProblem.ts`, `ThinkingProfile.ts`, `DailyChallenge.ts`, `ScheduledChallenge.ts`, `StudentGameStats.ts`
- Routes: `thinkingLabRoutes.ts` (~27 endpoints); Controller `thinkingLabController.ts`; Service `thinkingLabService.ts`
- Client: `api/thinkingLabApi.ts`, pages `ThinkingLab`, `ThinkingLabAdmin`

## Dependencies & Connected Modules
StudentGameStats + gamificationService, aiGateway (OpenAI↔Claude failover), speakingService (Whisper), codeRunnerService (Piston).

## Entry / Exit Points
Entry: `/thinking-lab/today` (on-demand adaptive pick). Flow: approach (≥30 words gate) → hints → run → submit → voice/journal → profile/analytics. Admin: problems CRUD + generate/generate-bulk + schedule.

## Database Tables & Relationships
DailyChallenge indexes `{tenantId,studentId,date,seq}`, `{tenantId,studentId,status}`. ScheduledChallenge unique `{tenantId,batchId,date}`. StudentGameStats unique `{tenantId,studentId}` + xp leaderboard indexes. ThinkingProfile unique `{tenantId,studentId}`.

## Events / Notifications / Emails / WhatsApp
In-app XP/coins/badges on solve/voice/journal. Bell notification on admin-scheduled challenge. **No** email/WhatsApp streak reminders.

## AI Features
OpenAI `gpt-4o-mini` default; Claude Sonnet for "interview" difficulty. `generateThinkingProblem`, `evaluateSubmission` (10-dim rubric), `evaluateVoiceExplanation` (Whisper→AI), `computeThinkingProfile` (40 recent attempts), `explainStepByStep` (AI dry-run). Metered via aiGateway.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| OpenAI/Claude (aiGateway) | gen + rubric eval | gpt-4o-mini ~₹12.75/₹51 per M; Claude Sonnet ~₹255/₹1275 | metered to AiUsage |
| Whisper | voice eval | ~₹0.51/min | |
| Piston | code run | ₹0 marginal | |

## Validation Rules & Edge Cases
Approach ≥30 words unlocks editor; adaptive difficulty from recent perf; weak-category bias (<60% solve); hints cost XP; streak IST-aware; XP formula (base 50–130 + perfect/no-hint/explain bonuses); hidden test cases never sent; timeSpent capped 86400s; unlimited retries.

## Completion Breakdown
| Dimension | % | Reasoning |
| Backend | 95 | All routes/services; missing cron |
| Frontend/UI | 85 | Student loop + admin; analytics needs polish |
| API | 90 | Complete |
| Database | 90 | Comprehensive indexes |
| Automation | 20 | **On-demand only — no daily-gen cron/reminders** |
| AI | 85 | Multi-model, rubric, voice, profile, explain |
| Testing | 5 | None found |
| **Overall** | **72** | Strong UX; automation + testing weak |

## Gaps
- **Not Implemented:** daily-challenge cron + morning reminder, WhatsApp/email streak nudges, rate-limit on admin generate (AI-quota abuse), difficulty auto-calibration, `given_up` never set, i18n/WCAG, admin cohort weak-concept heatmap (limited), audit log, leaderboard caching.

## Technical Debt / Performance / Security / Scalability
Uncached AI calls; leaderboard aggregated per request; multer temp files with risky `unlinkSync` cleanup; magic numbers hardcoded; IST util duplicated.

## Suggestions & AI Opportunities
6 AM IST cron to pre-assign adaptive challenge + push; cache leaderboard (TTL 1h); rate-limit generation; consolidate on Claude for premium eval; predictive weak-area recommendations.

## Estimated Dev Effort
Cron + reminders ~3 d; leaderboard cache + rate-limit ~2 d; tests ~3 d.
