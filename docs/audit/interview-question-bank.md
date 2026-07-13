# Interview Question Bank
**Completion:** 84%  |  **Priority:** P2  |  **Business Impact:** High

## Purpose & Business Goal
Two distinct "question bank" systems exist in the codebase — this doc covers the **modern, template-driving `InterviewQuestionBank`** (the one templates/sections reference and the AI grader reads). It stores richly-structured, gradeable interview questions: classification (category/type/topic/role/experience), answer mode (text/audio/video/mcq/code/structured_explanation), expected-answer guidance, evaluation rubric, keywords for matching, MCQ options, and follow-up triggers. This is the intelligence that makes AI/keyword grading possible. Business goal: build a reusable, AI-gradeable bank once, then sample it into any template.

> **Note:** A separate legacy `InterviewQuestion` (chapter-scoped flashcard Q&A) exists — audited in `interview-legacy-qa.md`. Do not confuse them: the template pipeline uses `InterviewQuestionBankModel` only.

## Primary Users & Roles
- **TENANT_ADMIN / INSTRUCTOR / STAFF** — full CRUD + AI-generate (permission `manage_interview_templates`).
- **STUDENT** — never accesses the bank directly (correct answers/rubrics are never leaked; snapshot into attempt strips `isCorrect`).

## Key Files (traced)
- `server/src/models/InterviewQuestionBankModel.ts` — schema with `EvaluationRubric`, `MCQOption`, `FollowUpTrigger` sub-schemas; 5 compound indexes.
- `server/src/controllers/interviewTemplateController.ts` — `createQuestion` (L170), `bulkCreateQuestions` (L181), `aiGenerateQuestions` (L196, 503 if AI off / 502 if none usable), `getQuestions` (L224), `getQuestionById` (L247), `updateQuestion` (L258), `deactivateQuestion` (L269), `getQuestionTopics` (L280), `getQuestionTags` (L291).
- `server/src/services/interviewTemplateService.ts` — CRUD (L143-275), `aiGenerateQuestions` (L166) with optional `persist`.
- `server/src/services/interviewAIService.ts` — `generateQuestions` (L295) authors open + MCQ items (8000-token budget, truncation-salvage via `extractObjects`).
- `client/src/pages/InterviewQBManagement/index.tsx` (349 lines) — modern bank UI.

## Dependencies & Connected Modules
- **Interview Templates** — sections reference `questionIds` or random-sample by category/topic/difficulty/tags.
- **AI Virtual Interview** — `evaluateQuestionResponse` fetches the question by id to grade (MCQ correctness / rubric / keywords).
- **interviewAIService** (Claude) — for AI generation.

## Entry / Exit Points
- Entry: `POST /interview-module/question-bank`, `/bulk`, `/ai-generate`; queries `/question-bank`, `/topics`, `/tags`.
- Exit: consumed by template builder (question picker) and `startAttempt` snapshot + grader.

## Database Tables & Relationships
- `interviewquestionbanks` — refs Tenant, User; embedded rubric/mcqOptions/followUpTriggers; `followUpTriggers.followUpQuestionId` self-refs the bank.
- Indexes: `{tenantId,isActive,interviewCategory}`, `{tenantId,topic,difficulty}`, `{tenantId,questionType}`, `{tenantId,tags}`, `{tenantId,roleTarget,experienceLevel}`.

## Events / Notifications / Emails / WhatsApp
- None. Pure authoring layer.

## AI Features (which model)
- **Claude** (model resolved via `INTERVIEW_AI_MODEL` → `ASSESSMENT_GEN_MODEL` → sonnet fallbacks) generates question-bank items in `generateQuestions()`. Produces open items (with expectedAnswerPoints, sampleStrongAnswer, weakAnswerIndicators, rubric, keywords) or MCQ items (4 options, exactly 1 correct, validated). Robust to truncated JSON.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| Claude (Anthropic) | AI-generate question-bank items | ≈ ₹0.25 in / ₹1.25 out per 1K tokens (₹250/₹1250 per 1M, from `INTERVIEW_AI_PRICE_IN=3`,`_OUT=15` USD ≈ ₹) | 8000-token output budget per generate call; cost not persisted for generation (only attempt grading tracks cost) |

## Validation Rules & Edge Cases
- MCQ generation drops items with <2 options or ≠1 correct answer (AI service L363).
- `deactivateQuestion` is a soft-delete (`isActive=false`); snapshot only pulls `isActive:true`.
- `aiGenerateQuestions` returns 503 when `ANTHROPIC_API_KEY` missing, 502 when no parseable questions.
- Edge gaps: no dedupe of near-identical questions; no schema-level check that MCQ answerMode items actually carry `mcqOptions` on manual create; `enableFollowUp`/`followUpTriggers` stored but **never consumed** by the runtime grader/interviewer.

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 92 | Full CRUD, bulk, AI-generate, topic/tag facets |
| Frontend/UI | 82 | Modern QBManagement modal is strong; follow-up config not exposed |
| API | 95 | All endpoints role-guarded |
| Database | 95 | Rich schema + 5 targeted indexes |
| Automation | 70 | AI-generate is the automation; no scheduled refresh/dedup |
| AI | 85 | Solid generation w/ truncation salvage; no difficulty auto-calibration or dedupe |
| Testing | 5 | No tests |
| **Overall** | **84** | Strong authoring layer; follow-up feature dormant, no dedupe |

## Gaps
- **AI — Not Implemented (partial):** `enableFollowUp`/`followUpTriggers` schema exists but the live interviewer and grader never use it.
- **Validation — Not Implemented:** no duplicate detection; no enforce that manually-created MCQ items include options.
- **Features:** no bulk export (CSV/JSON) or import-from-file (bulk is API-array only); no question preview/test-grade in UI.
- **Analytics:** no per-question usage stats (how often asked, avg score) — the modern bank has no `viewCount`/discrimination metrics (the *legacy* model does).
- **UX:** no follow-up builder; no tag autocomplete from existing tags endpoint.
- **Audit logs — Not Implemented.**

## Technical Debt / Performance / Security / Scalability
- Two parallel "question bank" systems (`InterviewQuestion` vs `InterviewQuestionBank`) — naming collision is a maintenance trap; the FE "InterviewQuestionBank" page actually drives the *legacy* model, while `InterviewQBManagement` drives the modern one. High confusion risk.
- Correct answers are properly stripped on snapshot (good security).
- AI generation cost is not attributed to a tenant budget.

## Suggestions & AI Opportunities
- Wire up `followUpTriggers` into `nextInterviewerTurn` (adaptive probing) and structured grader.
- Add AI dedupe + difficulty auto-calibration on generate.
- Add per-question analytics (usage, avg score, discrimination) to prune weak questions.
- Rename/consolidate the two banks to remove confusion.

## Estimated Dev Effort
- Follow-up trigger wiring: ~2 days. Dedupe + calibration: ~2 days. Per-question analytics: ~1.5 days. Export/import UI: ~1 day. Tests: ~1 day. **Total ≈ 7–8 dev-days.**
