# Skill Assessment Funnel

**Completion:** 82%  |  **Priority:** P1  |  **Business Impact:** High

## Purpose & Business Goal
Public, AI-driven candidate funnel and top-of-funnel revenue engine: register → WhatsApp OTP → auto LMS account → Claude-designed adaptive exam → Piston-graded coding → Readiness + percentile → Claude roadmap + skill-gap → auto preview-enroll → CRM lead sync. Converts ad/organic candidates into verified students and hot leads.

## Primary Users & Roles
Candidate (public, no auth); auto-created STUDENT; Telecaller/Mentor/Tenant-Admin (view candidates, journey, unlock). Public `/public/assessment/*` unauthenticated; admin `/assessment-items`, `/assessment-candidates` auth+tenant.

## Key Files (traced)
- Models: `AssessmentBlueprint.ts`, `AssessmentItem.ts` (6 item types), `AssessmentOtp.ts` (TTL), `AssessmentSubmission.ts` (16 sub-docs)
- Routes: `publicAssessmentRoutes.ts`, `assessmentItemRoutes.ts`, `assessmentCandidatesRoutes.ts`
- Services (12): `assessmentOtpService`, `assessmentAccountService`, `assessmentBlueprintService`, `assessmentExamDesignerService`, `assessmentQuestionGeneratorService`, `assessmentCodeGradingService`, `assessmentScoringService`, `assessmentLeadService`, `assessmentRoadmapService`, `assessmentSkillGapService`, `assessmentProfileScoreService`, `assessmentEnrollmentService`
- Controllers: `publicAssessmentController`, `assessmentItemController`, `assessmentCandidatesController`
- Pages: `Assessment/Landing|Register|Exam|Result`, `AssessmentAdmin`, `AssessmentCandidates`

## Dependencies & Connected Modules
User (auto-account), Lead (CRM), LearningCurriculum + CurriculumEnrollment (preview enroll), Payments (unlock — **wired via paymentController**), WhatsApp (OTP), Piston, Claude/OpenAI, GitHub API, Resume parser, Track Personalization (master-track cloning).

## Entry / Exit Points
Entry: `/public/assessment/register`. Exit: `/result/:token` (scores/roadmap/account CTA), auto-enrollment (preview 2 days), lead enriched. Admin exit: `/assessment-candidates/unlock` flips `previewOnly:false`.

## Database Tables & Relationships
Submission → User (candidateUserId), Lead (leadId), Blueprint, items→AssessmentItem, roadmap.planId→LearningCurriculum. Indexes `{tenantId,status,createdAt}`, `{tenantId,segment,readinessScore}`, `{tenantId,phone}`. OTP TTL auto-expire.

## Events / Notifications / Emails / WhatsApp
WhatsApp OTP (Meta Cloud API, 10-min TTL, 5 attempts, 30s throttle, devCode fallback); welcome/returning-user email (temp password); best-effort WhatsApp account credentials; CRM lead activity with scores/priority. Background (non-blocking): exam design, roadmap, skill-gap, question warm-up.

## AI Features
| Feature | Model | Provider | Fallback |
| Exam design | claude-sonnet-4-6 | Anthropic | default segment blueprint |
| Question gen | claude-sonnet-4-6 | Anthropic (Piston-verified) | manual bank |
| Roadmap | claude-sonnet-4-6 | Anthropic | deterministic pick |
| Skill gap | claude-sonnet-4-6 / gpt | Anthropic/OpenAI | role-skill map |
| Resume/comms score | claude / gpt-4o-mini | Anthropic/OpenAI | pending |
GitHub score = heuristic (no AI). Question gen metered via `recordUsage`; others not.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| WhatsApp Cloud API | OTP + creds | ~₹0.10–0.15/msg (first 1000 free) | |
| Claude Sonnet | design/gen/roadmap/gap | ~₹0.08–0.15/candidate | |
| OpenAI gpt-4o-mini | profile fallback | ~₹0.002–0.01 | |
| Piston (self-host) | code grading | ₹0 marginal | |
| GitHub API | profile heuristic | ₹0 (60/hr unauth) | |
**Total ≈ ₹0.08–0.15/candidate; ~₹245/mo per 1000 candidates.**

## Validation Rules & Edge Cases
Phone ≥10 digits normalized; OTP SHA-256 hashed, consume-on-use; resume PDF/DOCX/TXT ≤5MB best-effort; atomic stage claim (concurrency-safe); mobile zero-drop-off (live_code→predict_output); Wave A no-execution grading + Wave B Piston (15s/256MB); percentile floor 40 if <5 peers; anti-cheat flags **logged not enforced**; idempotent preview enroll.

## Completion Breakdown
| Dimension | % | Reasoning |
| Backend | 95 | 8 public + 11 admin endpoints, full engine |
| Frontend/UI | 85 | Register/OTP/resume/exam/result; admin thinner (no blueprint builder) |
| API | 95 | Comprehensive |
| Database | 100 | 4 models, TTL, indexes |
| Automation | 80 | Background AI tasks; no follow-up drip/reminders |
| AI | 90 | 5 AI services w/ fallbacks; no spend cap |
| Testing | 0 | None |
| **Overall** | **82** | Production-viable at moderate scale |

## Gaps
- **Paid full-unlock UI** (payment plumbing exists in `paymentController`; student-facing unlock screen missing — the real revenue blocker).
- **Not Implemented:** anti-cheat *enforcement*, per-item time enforcement, rate-limiting on public endpoints, follow-up/exam-reminder drip, proactive result email, bulk candidate export, blueprint admin UI, retake cooldown, PII-at-rest encryption, conversion-funnel analytics, tests.

## Technical Debt / Performance / Security / Scalability
Open public endpoints (register/verify/run-code) unthrottled → DoS/abuse; devCode in non-prod logs; resume files on disk unencrypted; prompt-injection surface (unsanitized resume/goals to Claude); O(n) percentile recompute per submit; polling for exam design (3s); no Redis cache for blueprint/items.

## Suggestions & AI Opportunities
Global rate limiter on public routes; ship the paid-unlock screen; queue+retry for AI background tasks; incremental percentile; anti-cheat scoring; multi-language exams; proctoring.

## Estimated Dev Effort
Paid-unlock UI ~3–4 d; rate-limit + hardening ~3 d; anti-cheat enforcement ~3 d; tests ~4 d.
