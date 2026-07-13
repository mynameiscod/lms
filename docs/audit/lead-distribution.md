# Lead Distribution
**Completion:** 72%  |  **Priority:** P3  |  **Business Impact:** Medium

## Purpose & Business Goal
Lightweight auto-assignment of incoming leads to sales agents, independent of the scoring engine. Supports `round_robin`, `weighted`, and `manual` modes with a per-tenant enable flag, eligible-role filtering, and daily per-agent lead caps. Ensures inbound leads get distributed fairly/by-capacity across the telecaller team without manual triage.

## Primary Users & Roles
- **TENANT_ADMIN** (`manage_leads`) — configures distribution mode, weights, caps.
- Runs automatically (no end-user interaction) on lead creation.

## Key Files (traced)
- `server/src/services/leadDistributionService.ts` (104) — `autoAssignLead`, `getCandidates`, `pickRoundRobin`, `pickWeighted`.
- `server/src/controllers/leadDistributionController.ts` (37) — `getDistributionConfig`, `upsertDistributionConfig`.
- `server/src/routes/leadDistributionRoutes.ts` (14).
- `server/src/models/LeadDistributionConfig.ts` (52).
- `client/src/pages/LeadDistributionSettings/index.tsx` (211).

## Dependencies & Connected Modules
- Invoked internally by `leadController.ts:468` (create, fire-and-forget) and `aiCallWebhookController.ts:305`. No public trigger endpoint.
- **Conflicts with Lead Scoring** — `scoreAndAssignLead` (`leadController.ts:456`) also sets `Lead.assignedTo` in the same create flow; the two race on the same field.
- Reads `User` (by tenant/role), aggregates `Lead` (today's counts), writes `Lead.assignedTo`.

## Entry / Exit Points
- `GET /lead-distribution-config/` — read config (`manage_leads`).
- `PUT /lead-distribution-config/` — upsert config (`manage_leads`).
- Assignment itself is internal, not an endpoint.

## Database Tables & Relationships
- `LeadDistributionConfig` (unique per tenant): `mode` (default manual), `eligibleRoles[]`, `maxLeadsPerDayDefault` (20), `weights[]` (`{userId, weight, maxLeadsPerDay?}`), `roundRobinPointer` (null), `enabled` (false).
- **Type inconsistency:** `tenantId`/`userId` stored as **String** here vs ObjectId elsewhere — see gaps.

## Events / Notifications / Emails / WhatsApp
- None directly; writes `assignedTo`, then Lead Management emits `lead_assigned` socket event.

## AI Features (which model, or "None")
None. Pure deterministic assignment logic.

## Third-Party Integrations & Cost
| Service | Purpose | Pricing (₹ INR) | Notes |
|---|---|---|---|
| — | None | ₹0 | No external services |

## Validation Rules & Edge Cases
- Disabled/manual short-circuit; empty candidate list → silent no-op.
- Daily cap enforced via `Lead` aggregation (today's count per assignee).
- Weighted: zero-total-weight fallback to first candidate; final loop guard.
- Round-robin pointer resets to index 0 if stored pointer no longer a candidate.
- Errors swallowed (`catch → return null`).

## Completion Breakdown
| Dimension | % | Reasoning |
|---|---|---|
| Backend | 80 | All three modes + caps implemented; likely String/ObjectId aggregation bug + swallowed errors. |
| Frontend/UI | 75 | Clean settings page for mode/caps/weights; missing `eligibleRoles` control + no pointer/status view. |
| API | 70 | Config CRUD only; no simulate/reassign/audit endpoints. |
| Database | 95 | Model covers all modes + per-agent overrides. |
| Automation | 70 | Auto-runs on 2 ingestion paths but races the scoring engine's assignment. |
| AI | N/A | None by design. |
| Testing | 0 | No tests. |
| **Overall** | **72** | Functional + UI-complete for basics; undermined by double-assignment conflict and a probable type-mismatch cap bug. |

## Gaps (mark "Not Implemented")
- **Double-assignment conflict** with `scoreAndAssignLead` — both write `assignedTo` on create; no coordination (likely real bug).
- **Probable String-vs-ObjectId mismatch** in daily-cap aggregation → cap may never trigger.
- **`eligibleRoles` UI control:** Not Implemented (model/controller field only; settable via raw API).
- No simulate/preview/manual-reassign endpoint.
- No assignment audit/metrics; errors swallowed silently.
- No cap enforcement in weighted mode beyond candidate pre-filter.
- **Testing:** Not Implemented.
- No empty-state when `users.length === 0`; no display of pointer/today's counts.

## Technical Debt / Performance / Security / Scalability
- **Debt:** competes with scoring-engine assignment; type inconsistency (String IDs).
- **Correctness:** cap aggregation may silently match nothing due to type mismatch.
- **Observability:** silent failures — no logging/metrics of assignment decisions.

## Suggestions & AI Opportunities
- Merge with the scoring engine's assignment into a single, ordered assignment pipeline. Fix ID types. Add `eligibleRoles` UI, a simulate endpoint, and assignment audit log.
- **AI:** skill/conversion-based matching (assign hot leads to top closers by historical win-rate); load-balancing that factors in agent live availability.

## Estimated Dev Effort
- Consolidate with scoring assignment + fix ID types: 3–4 days. eligibleRoles UI + simulate + audit: 2–3 days. Tests: 1–2 days. **Total to ~90%: ~1.5 weeks.**
