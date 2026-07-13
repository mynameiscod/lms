# Gamification
**Completion:** 68%  |  **Priority:** P3  |  **Business Impact:** Medium

## Purpose & Business Goal
Engagement/retention layer that rewards learning activity with XP, coins, levels, streaks, and badges/achievements, plus leaderboards. Drives daily habit formation ("solve today to keep your streak") across the Logical Thinking Lab, Speaking Practice, and AI Communication Lab — a proven lever for course completion and stickiness in ed-tech.

## Primary Users & Roles
- **STUDENT** — earns XP/coins/badges, views stats/leaderboard/achievements.
- **TENANT_ADMIN** — problem/challenge/task authoring, compliance dashboards, one privacy toggle. No badge/XP config UI.

## Key Files (traced)
- Models: `server/src/models/StudentGameStats.ts` (Thinking Lab), `CommunicationStreak.ts`, `CommunicationAchievement.ts`
- Services: `server/src/services/gamificationService.ts` (85 lines, Thinking Lab), `communicationGamificationService.ts` (118 lines)
- Controllers: `thinkingLabController.ts`, `speakingController.ts`, `communicationController.ts`
- Routes: `thinkingLabRoutes.ts`, `speakingRoutes.ts`, `communicationRoutes.ts`
- Client: `client/src/pages/ThinkingLab/index.tsx` (~650), `SpeakingPractice/index.tsx` (~170); client API `thinkingLabApi.ts`, `speakingApi.ts`
- Config: `server/src/config/settingsRegistry.ts` (`COMMUNICATION_LAB_LEADERBOARD`)

## Dependencies & Connected Modules
- **Thinking Lab** — the ONLY caller of `gamificationService` (`applySolve`, `addBonusXp`, `badgeStatus`).
- **Communication Lab** — the ONLY caller of `communicationGamificationService` (`evaluateAchievements`, leaderboard).
- **Speaking Practice** — has its own inline leaderboard (count/avg/weekly-streak); no XP/coins.
- **notificationService** — Communication Lab submit notification.
- NOT integrated with Assignments / Code Snippets / Playground / Project Builder (no XP for those).

## Entry / Exit Points
- Thinking Lab: `GET /thinking-lab/stats|badges|leaderboard|analytics`; award happens inside `POST /:id/submit|voice|journal`.
- Speaking: `GET /speaking/leaderboard` (+ my-stats).
- Communication: `GET /communication/achievements|leaderboard|progress`; award inside `POST /submit`.
- Exit: in-app notification on Communication submit.

## Database Tables & Relationships
- **studentgamestats** — tenantId, studentId (unique w/ tenant), xpTotal, coins, level, solvedTotal, perfect/noHint/interview solves, currentStreak/longestStreak, lastSolvedDate (IST), byCategory (Mixed), badges[{key, earnedAt}]. Indexes: `(tenantId,studentId)` unique, `(tenantId, xpTotal desc)`, `(tenantId, batchId, xpTotal desc)`.
- **communicationstreaks** — currentStreak, longestStreak, totalCompletedDays, completedDates[] (capped 400), lastCompletedDate.
- **communicationachievements** — `(tenantId, studentId, achievementCode)` unique; earned + earnedAt.

## Events / Notifications / Emails / WhatsApp
- **Communication Lab**: in-app notification on submit-scored (`createNotifications`, links `/ai-communication-lab`). NOT on achievement earned.
- **Thinking Lab / Speaking**: NO badge/level-up notifications.

## AI Features (which model, or "None")
- Gamification core: **None** (pure arithmetic).
- (Adjacent labs use AI for scoring/transcription, but XP/badge logic itself is deterministic.)

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| — | Gamification is self-contained | ₹0 | No third-party. Bunny/Whisper/Claude belong to the host labs, not gamification |

## Validation Rules & Edge Cases
- **Idempotent awards**: `gameAwarded` / `voiceXpAwarded` / `journalXpAwarded` flags ensure once-per-challenge award.
- **Level**: `floor(xp/500)+1`; **coins**: `max(2, round(xpEarned/5))`; bonus coins `max(1, round(amount/10))`.
- **Streak**: increments only if `lastSolvedDate === yesterday` (IST date strings); resets on gap.
- **Badges** (11, hardcoded): first_challenge, streak_10, solve_50/100, category masters (pattern/math/array/recursion), interview_ready, logic_champion (lvl≥10), grand_master (10k XP). Never revoked.
- **Communication achievements** (10): streak/score/skill-based; dedup via upsert `$setOnInsert`.
- **Leaderboard privacy**: Communication board gated by `COMMUNICATION_LAB_LEADERBOARD` setting; non-admins see own batch only.
- Edge: no daily XP cap (farmable); coins never spent; voice/journal bonus gated per-challenge not per-student.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 85 | XP/coins/level/streak/badges + achievements + leaderboards all implemented, idempotent, timezone-aware. |
| Frontend/UI | 70 | Thinking Lab UI complete (stats/badges/leaderboard/analytics tabs). Speaking has basic stats. Communication Lab client page NOT found. |
| API | 80 | Full stats/badges/leaderboard/achievement endpoints across 3 labs. |
| Database | 85 | Well-indexed, denormalized, capped arrays. |
| Automation | 75 | Auto-award on activity; auto badge checks. No level-up alerts, no coin economy. |
| AI | 0 | None (correct for core). |
| Testing | 5 | No tests. |
| **Overall** | **68** | Solid, engaging core in Thinking Lab; fragmented across labs; missing coin economy, admin config, and unified experience. |

## Gaps (mark "Not Implemented")
- **Coin redemption / shop** — coins accumulate with NO way to spend; no admin price config ("Not Implemented").
- **Admin badge/achievement config** — all definitions + thresholds hardcoded in service; no per-tenant customization ("Not Implemented").
- **XP/level tuning UI** — formulas hardcoded (÷500, ÷5); no admin control ("Not Implemented").
- **Level-up / badge-earned notifications** — Not Implemented (only Communication submit-score notification).
- **Cross-module leaderboard** — leaderboards siloed per lab; no unified "Super Learner" board ("Not Implemented").
- **Gamification for other coding modules** — Assignments/Snippets/Playground/Projects award NO XP ("Not Implemented").
- **Communication Lab client UI** — routes exist, no dedicated page found ("Not Implemented / missing").
- **Thinking Lab achievements** — only badges, no separate achievement track.
- **Admin analytics** — no XP/coin trend dashboards.
- **Badge retraction / anti-abuse** — no daily XP cap; badges never revoked.
- **Automated tests** — Not Implemented.

## Technical Debt / Performance / Security / Scalability
- Two parallel gamification systems (Thinking vs Communication) with divergent models/logic — duplicated concepts, hard to evolve.
- Coins are a dead-end currency (earned, never spent) — user-facing anticlimax.
- Hardcoded rules block per-tenant differentiation (a SaaS selling point).
- No daily XP cap = leaderboard gaming risk.
- Voice/journal bonus gating is per-challenge, not per-student — potential multi-award.

## Suggestions & AI Opportunities
- Unify into one gamification service + one leaderboard spanning all coding activities (award XP from Assignments/Snippets/Playground/Projects).
- Build a coin shop (hints, cosmetic themes, streak-freeze) + admin price config; move badge/XP rules to Platform Settings.
- Add level-up/badge-earned celebrations + notifications.
- AI opportunity: Claude-generated personalized "next challenge" nudges and weekly progress summaries.
- Add daily XP cap + anti-abuse; write tests for award idempotency and streak math.

## Estimated Dev Effort
- Unified gamification + cross-module XP hooks: ~6–8 dev-days.
- Coin shop + admin config: ~5 dev-days.
- Notifications + celebrations: ~2 dev-days.
- Communication Lab UI: ~3 dev-days.
- Tests + anti-abuse: ~3 dev-days.
- **Total to ~90%: ~4 weeks.**
