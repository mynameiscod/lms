# Qualification Questions

**Completion:** 67%  |  **Priority:** P3  |  **Business Impact:** Medium

## Purpose & Business Goal
Configurable multi-tenant lead-qualification question set (10 defaults across employment/education/budget/timeline/technical/career) feeding lead scoring, telecaller call flows, and WhatsApp drip capture.

## Primary Users & Roles
Admin/Sales-manager (configure, scoring rules); Telecaller (answer per stage); Lead (WhatsApp/web). auth+tenantResolver + roleGuard(`manage_leads`,`view_leads`,...).

## Key Files (traced)
- Model: `QualificationQuestionConfig.ts` (unique per tenantId; DEFAULT set embedded)
- Routes: `qualificationRoutes.ts`; Controller `qualificationController.ts`
- Page: `QualificationSettings`

## Dependencies & Connected Modules
Lead (qualificationAnswers Map + fieldToUpdate auto-updates), LeadStage (showInStages), Lead scoring (scoreImpact), WhatsApp service (drip).

## Entry / Exit Points
Entry: admin config CRUD/reorder/reset. Runtime: `/qualification/stage/:stageId` (telecaller), `/qualification/leads/:leadId/answers` (save/get).

## Database Tables & Relationships
QualificationQuestionConfig: questions[] (id, question, category, answerType, options, showInStages→LeadStage, fieldToUpdate, scoreImpact[], validation, skipKeywords), settings, whatsappSettings.

## Events / Notifications / Emails / WhatsApp
WhatsApp drip (referenced): send questions, timeout `noResponseTimeoutHours`. Lead field auto-update + score recalculation on answer.

## AI Features
None (config-driven).

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| WhatsApp Cloud API | drip Q&A capture | ~₹0.10–0.35/msg | via whatsApp drip service |

## Validation Rules & Edge Cases
Required question/category/answerType/order; select needs ≥1 option; number min/max; text regex; skipKeywords skip logic; scoreImpact value→delta.

## Completion Breakdown
| Dimension | % | Reasoning |
| Backend | 85 | CRUD complete; WhatsApp refs partial |
| Frontend/UI | 70 | Settings page; question editor to verify |
| API | 90 | All endpoints |
| Database | 95 | Flexible schema |
| Automation | 30 | Drip flow referenced, not fully wired |
| AI | 0 | N/A |
| Testing | 0 | None |
| **Overall** | **67** | Solid data layer; WhatsApp automation to complete |

## Gaps
- **Declared-but-not-executed:** `scoreImpact`/`fieldToUpdate` reportedly not applied at answer time.
- **Not Implemented:** full WhatsApp drip scheduling/parsing/timeout, multi-stage display logic in telecaller flow, frontend validation UI, edit audit, CSV import, answer-distribution analytics, i18n.

## Technical Debt / Performance / Security / Scalability
Hardcoded default questions in model; `fieldToUpdate` string-matched to Lead schema (no validation); linear score summation (no weighting/decay); hardcoded WhatsApp messages.

## Suggestions & AI Opportunities
Apply scoreImpact/fieldToUpdate on save; AI intent-parse free-text WhatsApp replies; answer analytics; templated messages.

## Estimated Dev Effort
Wire scoreImpact/field-update ~2 d; WhatsApp drip completion ~1 wk; analytics ~2 d.
