# Drills / LogicGym

**Completion:** 70%  |  **Priority:** P3  |  **Business Impact:** Medium

## Purpose & Business Goal
Instructor-assigned single-concept micro-problems ("Logic Building") reinforcing fundamentals with a plan-first (pseudocode) methodology, hint-guided debugging, and Piston-verified test cases. Complements the adaptive Thinking Lab.

## Primary Users & Roles
STUDENT (open assigned, plan, solve, track); INSTRUCTOR/ADMIN (assign to students/batches, preview generation, cohort view). Admin roleGuard(`create_courses`,...).

## Key Files (traced)
- Models: `DrillAssignment.ts`, `DrillAttempt.ts`
- Routes: `drillRoutes.ts`; Controller `drillController.ts`; Service `drillService.ts`
- Client: `api/drillApi.ts`, pages `DrillsAdmin`, `LogicGym`

## Dependencies & Connected Modules
codeRunnerService (Piston), assessmentQuestionGeneratorService (reused generator), aiGateway (OpenAI plan-eval/hints), notificationService.

## Entry / Exit Points
Entry: `/drills/assigned` (student) or admin `/drills/admin/assign`. Flow: plan (≥10 chars → AI eval) → run → solve. Admin: preview → assign → list.

## Database Tables & Relationships
DrillAssignment indexes `{tenantId,studentId,status}`, `{tenantId,createdAt}` → DrillAttempt (1-to-many; plan, planOk, attempts, hintsUsed, score, status).

## Events / Notifications / Emails / WhatsApp
In-app bell "🧩 New Logic Building problem assigned". **No** due-date reminders (email/WhatsApp).

## AI Features
OpenAI `gpt-4o-mini` only. `evaluatePlan` (pseudocode logic → {ok,hint}), `hintForFailure` (single-sentence nudge, never rewrite). Graceful fallback (plan auto-passes, "trace by hand").

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| Piston (self-host) | code exec | ₹0 marginal | primary, no fallback |
| OpenAI gpt-4o-mini | plan eval + hints | ~₹12.75/₹51 per M | cheap |

## Validation Rules & Edge Cases
Plan ≥10 chars; scoring 100 base −8/extra attempt −6/hint +5 planned, min 30; hidden test cases; 3× generation retry; concept list of 10 fundamentals; unlimited retries.

## Completion Breakdown
| Dimension | % | Reasoning |
| Backend | 90 | Full CRUD, preview-before-assign |
| Frontend/UI | 80 | Solver + admin; due-date UI thin |
| API | 85 | Complete |
| Database | 85 | Clean, indexed |
| Automation | 10 | **Manual assign only; no scheduler** |
| AI | 75 | Plan/hint AI with fallback |
| Testing | 0 | None |
| **Overall** | **70** | Strong core; automation + reminders missing |

## Gaps
- **Not Implemented:** scheduled/recurring assignment, due-date reminders, progressive hint levels, cohort weak-concept report, mobile, i18n.

## Technical Debt / Performance / Security / Scalability
Hardcoded 3 retries (no backoff); assumes `hidden` flag on test cases (defensive check needed); score only saved on first solve.

## Suggestions & AI Opportunities
"Assign every Monday" scheduler; due-date nudges; AI difficulty calibration; cohort analytics.

## Estimated Dev Effort
Scheduler + reminders ~3 d; analytics ~2 d; tests ~2 d.
