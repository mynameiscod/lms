# Learning & Curriculum Domain — Audit Summary
Auditor: Senior Software Architect + LMS Domain Expert. Repo: `d:\Simple_CB_LMS\Codebegun\lms-saas`. Scope: 8 modules of the Learning & Curriculum domain. All figures derived from traced source (models/routes/services/controllers/pages), not estimates.

### SUMMARY

| Module | Overall% | BE% | FE% | API% | DB% | Auto% | AI% | Priority | Impact | Top-3 Gaps | Third-party + Cost ₹ | 1-line status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Dashboard (student/admin) | 70 | 82 | 68 | 78 | 78 | 20 | 0 | P2 | High | No roleGuard on admin endpoints; no caching (N+1 aggregations); missing error/empty states | None (recharts client-side) — ₹0 | Data-rich admin+student dashboards; needs RBAC, caching, polish |
| Course Management | 62 | 70 | 55 | 70 | 75 | 10 | 0 | P2 | Medium | No cascade/soft-delete; no pagination; Content admin routes under-guarded | Local disk uploads (multer, non-CDN) — ₹0 | Mature 6-level CRUD backbone, eclipsed by newer curriculum system |
| Lessons & Lesson Progress | 55 | 60 | 55 | 50 | 70 | 10 | 0 | P3 | Medium | Dead `Lesson` model; ConceptLesson has no progress tracking; completion loop open | None (this module) — ₹0 | Fragmented: 1 dead model, 1 untracked format, progress owned by Interactive |
| Interactive Lessons | 78 | 82 | 88 | 78 | 90 | 55 | 80 | P1 | High | XP forgery (no server validation); no roleGuard/rate-limit; completeLesson doesn't advance enrollment | Claude (gen, ~₹1–6/lesson) + Piston (self-host ₹0) | Feature-rich builder+viewer; carries real security/integrity gaps |
| Curriculum & Content Library | 78 | 85 | 88 | 82 | 90 | 55 | 65 | P1 | High | No route RBAC; `/:id/stream` bypasses auth; CollegeCurriculum orphaned | Bunny Stream (video CDN) + Claude (day gen) | Production-grade authoring + library; gaps in RBAC, stream auth, tests |
| Enrollment & Learning Plans | 85 | 92 | 90 | 90 | 95 | 60 | 75 | P1 | High | No admin-route RBAC; DayView no auto-refresh on gen; thin completion/unlock notifications | Razorpay (2%+GST MDR; unlock ~₹4999) + Claude + Bunny | Most complete module; Razorpay + raise-concern now DONE |
| Batch Management | 62 | 68 | 72 | 68 | 76 | 30 | 0 | P2 | Medium | Non-transactional auto-enroll; no capacity enforcement; GET routes unguarded | None — ₹0 | Good calendar model + wizard; blocked by missing roster UI |
| Student Progress & Personalization | 68 | 82 | 30 | 72 | 85 | 70 | 80 | P1 | High | Timezone-naive streaks + dead `totalTimeSpent`; no student progress UI; no day-gen retry/fallback | Claude (personalized day gen ~₹3–8/day, de-duped) + Piston ₹0 | Strong AI personalization backbone; weak progress UI + resilience |

**Domain overall: ~70% complete.** Backend and data modeling are strong (avg BE ~78%, DB ~85%); the differentiated AI personalization + day-wise learning plan (Enrollment 85%, Curriculum 78%, Personalization 68%) is the crown jewel and largely works in production. Frontend is generally solid except the student progress surface (30%). Automation and testing are the weakest cross-cutting dimensions (avg Auto ~39%, Testing ~9%).

### Cross-cutting critical findings (fix first)
1. **Security — missing route-level RBAC on all newer routes**: curriculum, learning-library, concept-lesson, interactive-lesson, enrollment-plan, batch-offering, dashboard admin, and batch GET routes rely only on auth+tenant middleware. Legacy course/subject/topic/chapter/batch-mutation routes DO use `roleGuard`. A STUDENT token can reach admin dashboards and author/delete lessons/curricula. **~1 week to close.**
2. **Integrity — XP forgery** in `interactiveLessonController.saveSceneProgress`: client-supplied `xpEarned` is stored without validating against `scene.xpReward`. **~1 day.**
3. **Abuse — no rate limiting / spend caps** on `POST /interactive-lessons/execute` (Piston DoS) and `/generate-ai` (uncapped Claude spend). **~2–3 days.**
4. **Unauthenticated video** — `GET /learning-library/:id/stream` has no auth middleware (token-in-query only). **Review + Bunny signed URLs.**
5. **Testing ~9%** across the domain — only `planSchedule.test.ts` exists for the intricate cohort-scheduling logic. Highest-risk untested areas: scheduling/gating, personalization thresholds, day-gen concurrency.

### MEMORY corrections (verified against current code)
- **Razorpay is COMPLETE**, not incomplete: `paymentController` wires `createOrder → verifyPayment → unlockCandidatePlans` (flips `previewOnly`), webhook signature verification included (`routes/paymentRoutes.ts`).
- **Raise-a-Concern (Slice 5) is COMPLETE**: `concernRoutes.ts` + `Concern` model implement student raise / list / respond.
- **Dead code**: `server/src/models/Lesson.ts` is imported nowhere in `server/src` — safe to delete.
- **AI provider is Claude/Anthropic only** across the domain (`aiClients.getAnthropic`), default `claude-sonnet-4-6`; day-gen path does not use the OpenAI fallback that `aiGateway` supports.
