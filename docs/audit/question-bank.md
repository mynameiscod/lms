# Question Bank

**Completion:** 75%  |  **Priority:** P2  |  **Business Impact:** Medium

## Purpose & Business Goal
Centralized reusable question repository (manual + CSV + AI-generated) linked to many quizzes, with dedup, tagging, difficulty/type filters, and usage tracking.

## Primary Users & Roles
SUPER_ADMIN / TENANT_ADMIN / INSTRUCTOR (`create_question`, `edit_question`, `delete_question`). Full auth+tenant+roleGuard chain.

## Key Files (traced)
- Model: `server/src/models/Question.ts` (40 fields; text index)
- Routes: `server/src/routes/questionRoutes.ts` (12 endpoints under `/bank`)
- Services: `questionService.ts`, `aiService.ts` (OpenAI generation)
- Controller: `questionController.ts`
- Pages/components: `QuestionBuilder`, `QuestionManagement`, `components/QuestionBank`, `components/QuestionSelector`

## Dependencies & Connected Modules
Quiz (`questionIds[]`, `usedInQuizzes[]`), User (`createdBy`), aiService (OpenAI `gpt-4o-mini`).

## Entry / Exit Points
Entry: create/generate/import questions. Exit: link to quizzes; search/filter for selection.

## Database Tables & Relationships
Question — indexes `{tenantId,createdBy}`, `{tenantId,tags}`, `{tenantId,subject,topic}`, `{question:text}`. `duplicateOf` self-ref; `usageCount`/`usedInQuizzes[]` denormalized.

## Events / Notifications / Emails / WhatsApp
None. No audit trail.

## AI Features
`POST /bank/generate` → OpenAI `gpt-4o-mini` (hardcoded) generates MCQ/short-answer (NOT coding); regex-based dedup avoidance. `checkDuplicate`/`dedupeBankQuestions` use text-normalization (not semantic).

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| OpenAI gpt-4o-mini | Question generation | ~₹12.75/M in, ₹51/M out | Hardcoded model; not metered to AiUsage here |

## Validation Rules & Edge Cases
Required type/question/marks; flexible options (string|object); dedup keeps earliest by createdAt; non-atomic dedup (quizzes updated then dupes deleted).

## Completion Breakdown
| Dimension | % | Reasoning |
| Backend | 80 | CRUD + AI gen + dedup; non-atomic dedup |
| Frontend/UI | 65 | Builder/management present; no AI-generation UI found |
| API | 100 | 12 routes |
| Database | 90 | Rich schema; denormalized staleness risk |
| Automation | 70 | Usage tracking on link/unlink; no scheduled dedup |
| AI | 70 | MCQ/short-answer only; regex (not semantic) dedup |
| Testing | 0 | None |
| **Overall** | **75** | Usable for manual + AI MCQ; coding gen absent |

## Gaps
- **Not Implemented:** coding-question AI generation + test-case gen, semantic dedup, bulk import/export, versioning, approval workflow, client AI-gen UI, per-tenant AI model config, AI cost tracking here, separate AI rate limit, a11y.

## Technical Debt / Performance / Security / Scalability
No pagination on `getQuestionBank` (loads full collection); search hard-capped at 50; stats pipelines sequential (not `Promise.all`); AI throttle shared with SMTP; `options: Mixed[]` hard to validate; hard delete can strand `usedInQuizzes[]`.

## Suggestions & AI Opportunities
Cursor pagination; move AI gen to Claude (product direction) + meter via aiGateway; semantic dedup via embeddings; coding-question generation with Piston-verified outputs (pattern already exists in Assessment funnel).

## Estimated Dev Effort
Pagination + perf ~2 d; coding gen ~1 wk; semantic dedup ~3 d; import/export ~2 d.
