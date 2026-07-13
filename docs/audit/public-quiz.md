# Public Quiz

**Completion:** 68%  |  **Priority:** P2  |  **Business Impact:** High

## Purpose & Business Goal
Public lead-capture + skills-assessment funnel (e.g. "Tech Battle" weekly quizzes): unauthenticated registration → admin approval → token-gated single-device quiz → leaderboard → result/certificate/social share → CRM lead sync.

## Primary Users & Roles
Public (register/take/result via token, no auth); Admin (approve/reject, configure weeks, send links, leaderboard) via auth+tenant.

## Key Files (traced)
- Models: `server/src/models/PublicQuizConfig.ts`, `PublicQuizSubmission.ts`
- Controllers: `publicQuizController.ts` (~800 lines), `publicLeadController.ts`
- Routes: `adminPublicQuizRoutes.ts`, `publicLeadRoutes.ts`
- Pages: `PublicQuizAdmin/AllRegistrations`, `PublicQuizAdmin/RegistrationDetail`

## Dependencies & Connected Modules
Quiz, Question, WeekConfig, Tenant, User (approval), EmailService, Lead (CRM sync).

## Entry / Exit Points
Public: register → (approval) → `GET /public/quiz/:token` → start → heartbeat → submit → result. Admin: week-config, approve/reject/generate-link, send-quiz-links, leaderboard, all-registrations.

## Database Tables & Relationships
PublicQuizConfig (landingPage blocks, registrationForm, resultSettings, weekLabel, topperConfig, scheduledAt/closesAt, metaPixelId). PublicQuizSubmission (indexes `{tenantId,createdAt}`, `{tenantId,email}`, `{tenantId,weekLabel,rank}`; quizToken sparse-unique; activeSessionId/lastHeartbeat single-device lock).

## Events / Notifications / Emails / WhatsApp
Email quiz links on `send-quiz-links` (throttled). Best-effort Lead sync on register (priority hot). No WhatsApp here (platform supports it elsewhere). No in-app notifications for public users.

## AI Features
None (the adaptive AI exam is the separate Skill Assessment funnel).

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
| SMTP/Brevo | Approval + quiz-link emails | ~₹0 | Throttled; 1000 students ≈ ~50 min to send |
| Meta Pixel | Ad tracking (stored) | ₹0 (ad spend separate) | Not used in routes |

## Validation Rules & Edge Cases
Approval gate; single-device via 45s heartbeat; time-lock via eventDate/eventEndDate; MCQ-only grading; rank by score desc/time asc; dup by email+weekLabel; lead form rate-limited 10/IP/min.

## Completion Breakdown
| Dimension | % | Reasoning |
| Backend | 85 | Full register→grade→rank; missing reminders/bulk ops |
| Frontend/UI | 80 | Admin dashboards; public landing/form-builder UI thin |
| API | 100 | 12+ routes |
| Database | 100 | Indexed, relationships defined |
| Automation | 60 | Email links; no scheduled reminders |
| AI | 0 | None |
| Testing | 0 | None |
| **Overall** | **68** | Production-ready basic funnel; advanced ops missing |

## Gaps
- **Not Implemented:** public landing/form-builder UI, result dashboard, automated reminders, bulk CSV export, rate-limit on quiz endpoints, funnel analytics, approval audit logs, certificate auto-gen (template stored, unused), social-share wiring, tests, mobile polish.

## Technical Debt / Performance / Security / Scalability
Leaderboard loads all finishers (OOM risk >10k); O(n) rank recompute per submit; in-memory rate-limit map (lost on restart, not multi-instance); no CSRF/input sanitization on Mixed registrationData; file paths leaked in uploadedFiles.

## Suggestions & AI Opportunities
Paginate/cache leaderboard; incremental ranking; queue email; AI-grade free-text answers; conversion-funnel analytics; auto-certificate generation.

## Estimated Dev Effort
Reminders + export + analytics ~1 wk; leaderboard/rank scale ~3 d; security hardening ~3 d.
