# CareerPilot Analytics — Metric Definitions

Every figure Module 16 reports, with its source, its denominator and what it cannot tell
you. A number without its denominator is a rumour.

Analytics **owns nothing**. Each metric is read from the module that already decides it;
nothing here is recalculated, and the client recalculates nothing either.

---

## The population — who counts as a member

Defined once in `server/src/services/careerPilotPopulation.ts` and used by every metric.

> **CareerPilot member** = the user carries at least one *enrolment* fact:
> `passport.product` set, **or** `passport.active`, **or** `passport.activatedAt`,
> **or** `passport.verifiedAt`.

`passport: { $exists: true }` is **not** the rule and must never be used — `passport` is a
nested path whose defaults materialise the subdocument on every user, so it counted every
ordinary LMS student and deflated every percentage.

Enrolment, never activity. A member who signed up this morning and has done nothing is a
member; a denominator that moved with engagement would be useless for measuring engagement.

| Cohort | Meaning |
|---|---|
| Member | Ever enrolled, free or paid. **The denominator for the learning funnel.** |
| Active | Entitlement live now (`active` and not past `expiresAt`) |
| Free | Enrolled, never activated a membership |
| Expired | Was activated, is not entitled now |
| Onboarded | Completed CareerPilot career context |
| Paid | Answered from the **payment ledger**, not the user record — activation can be granted without money changing hands |

---

## Snapshot vs period

Two kinds of metric, never mixed. Every response declares which.

- **SNAPSHOT** — the world as it is now. Ignores the date range entirely. *Active members.*
- **PERIOD** — what happened in a window. Meaningless without one. *Missions completed.*

Ranges are **UTC**, default 30 days, capped at **400 days**. An invalid or over-long range
is a `400`, not a slow scan.

---

## Zero, no-data and unavailable are three different answers

| State | Means | Rendered |
|---|---|---|
| `0` | Measured, and it is zero | `0` / `0%` |
| `null` | Denominator is empty — nothing has happened | "No data" + reason |
| `coverage: unavailable` | Cannot be produced at all | "Unavailable" + reason |

A tenant with no members has not achieved 0% assessment completion.

---

## Learning funnel

Thirteen stages. **Every stage is a share of the member population — never of the stage
above**, because a chain of stage-to-stage percentages cannot be compared or added up.
Stages count **distinct members**, so three assessments by one person are one member.

| Stage | Source |
|---|---|
| Member | `User.passport` enrolment marker |
| Career context completed | `passport.contextCompletedAt` |
| Role selected | `passport.primaryRole` ≠ `NOT_SURE` |
| Assessment started / completed | `PersonalizedAssessment` (`status`, `submittedAt`) |
| Skill DNA available | `StudentSkillProfile` |
| Roadmap generated | `CareerRoadmap` (any status) |
| First mission completed | `XpLedger` `CAREER_MISSION_COMPLETED` |
| Active 7d | `XpLedger.at` — rolling 7 days, **not** the selected range |
| Reassessed | `PersonalizedAssessment` `purpose ≠ INITIAL` |
| Resume analysed | `PassportResume` |
| Mock interview completed | `PassportInterview status: completed` |
| Target company chosen | `passport.targetCompanies` |

**Reassessment participation** is the one metric whose denominator is not all members: only
somebody who has completed a first assessment can sit a second, so it divides by completions.

---

## Skills

Module 8's own policy (`targetScoreFor`, `classifyGap`, `isSufficientlyAssessed`) is
imported, not restated — a second opinion on "needs work" would disagree with the student's
own screen.

- **Average score** is taken over **sufficiently assessed** members only (MEDIUM/HIGH
  confidence). `null` when none are. **An unmeasured skill is never averaged as zero.**
- **LIMITED_EVIDENCE** is reported and excluded from the average — measured, not yet a
  conclusion.
- **Strictest applicable target.** Where two offered roles require the same skill at
  different levels, the higher target applies: clearing a WORKING bar does not satisfy a
  PROFICIENT requirement. This makes gap counts slightly conservative, deliberately.

### Blueprint coverage — two different questions

| Metric | Means |
|---|---|
| `effectiveBlueprintAvailable` | A blueprint **resolves at runtime**, possibly via Module 4's seeded fallback |
| `tenantAuthoredBlueprint` | This tenant has **stored a blueprint of its own** |

Reporting the first as configuration would tell an admin they had authored standards they
have never seen. Module 4's fallback is unchanged.

---

## Improvement — frozen history

Reads Module 13's immutable `beforeSnapshot` / `afterSnapshot`. A student who went 54 → 68
and has since reached 75 **improved by 14**. Reconstructing the "before" from today's Skill
DNA would report 21 and restate history every time they learned something.

**Comparable only:** a pair counts when both snapshots share a role **and** a blueprint
version. Otherwise the delta measures the standard moving, not the student — those are
counted as `incomparable`, and `averageReadinessDelta` is `null` when nothing is comparable.

---

## Persisted figures under accurate names

| Metric | What it is | What it is **not** |
|---|---|---|
| `roadmapReadinessSnapshot` | Readiness recorded **at plan generation** (`CareerRoadmap.input.readiness`) | current readiness — it lags anyone who has improved |
| `interviewEvaluationScoreDistribution` | Scores of graded interview **attempts**; one member with three sittings contributes three | a per-student readiness distribution |
| `legacyResumeScoreDistribution` | The older stored `PassportResume.score.total` | Resume Readiness |
| `reassessmentReadinessChange` | Module 13 frozen before/after delta | a current readiness figure |

---

## Unavailable, and why

| Metric | Reason |
|---|---|
| `currentRoleReadinessDistribution` | Derived on demand from Skill DNA and the published blueprint; not persisted at cohort scale |
| `currentResumeReadinessDistribution` | Module 14 computes per request and stores nothing |
| `currentInterviewReadinessDistribution` | Module 14 computes per request from the latest role interview |
| `currentCompanyReadinessDistribution` | Module 15 computes fit per student **per company** on demand |

These are stored nowhere by deliberate design — a persisted figure would be another thing to
invalidate whenever a score, role or blueprint changed. Producing a distribution would need
a per-student fan-out, which the analytics layer refuses.

**No substitute is shown in their place**, and none can render as `0%`.

Making them available needs an append-only readiness snapshot written at the existing write
moments — future work, and it would only measure from the day it shipped.

---

## Economy

Coins come from the **signed ledger**: issued and spent are two halves of one grouped sum,
so they cannot double-count, and outstanding is their difference rather than a third stored
number that could disagree. Budget utilisation is `budgetSummary`'s own figures.

---

## Query shapes

Every aggregation's output is proportional to the skill catalogue, the stage vocabulary or
the company list — **never to the number of students**.

| Domain | Collections | Index used | Bound |
|---|---|---|---|
| Funnel | users, personalizedassessments, studentskillprofiles, careerroadmaps, xpledgers, passportresumes, passportinterviews | `{tenantId}`, `{tenantId, studentId}` per collection | distinct-member counts |
| Skills | studentskillprofiles | `{tenantId, studentId, skillKey}` | ~skill catalogue |
| Improvement | personalizedassessments | `{tenantId, studentId, purpose, submittedAt}` | date-bounded |
| Roadmap | careerroadmaps | `{tenantId, studentId}` | ≤ 2 status rows |
| Engagement | xpledgers | `{tenantId, studentId, at}` | ~event vocabulary |
| Economy | coinledgers, rewardredemptions | `{tenantId, studentId}` | 1 + 4 rows |
| Interview | passportinterviews | `{tenantId, studentId, createdAt}` | ≤ 5 rows + scores |
| Companies | users | `{tenantId}` | `$limit 25` |

No index was added for analytics.
