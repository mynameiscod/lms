# Reusable Assessments + Per-Batch Deadlines & Late Policy — Implementation Plan

> Status: **DESIGN — not implemented.** Awaiting go-ahead per feature.
> Author aid: Claude. Related: `project-learning-plan-unification`, Tech Tagging (primaryTech), Batch Offerings.

## 1. Problem

Today `Assignment` and `Quiz` carry their **schedule on the content document itself**
(`startDate` / `dueDate` / `lateSubmissionDeadline` / `startTime` / `endTime`) plus
`selectedBatches`. So **one content item = one schedule = one batch set**. Reusing the
same assignment for another batch with different dates forces a **Clone** → a duplicate
document. At 200–300 batches this is unmanageable.

Separately, the **learning-plan** path (`LearningCurriculum` → `DayPlan` → `BatchOffering`
→ `CurriculumEnrollment`) already references content by `sourceModel`/`sourceId` and
computes a real per-batch date via `workingDateForDay(offering.startDate, dayNumber, holidays)`
— but it has **no configurable due window, no deadline enforcement, and no durable
"missed" status** (`overdue` is a pace-based label computed on read, never persisted).

## 2. Goal

1. **Content is reusable and dateless.** Author an assignment/quiz once (tagged by
   language / chapter / topic); no dates or batches on the doc.
2. **Schedule + deadline live per batch**, derived from the batch's plan start date.
3. **Late policy is admin-controlled, per batch, changeable any time** — including
   retroactively (soften a `hard_lock`, extend, reopen).
4. A **durable status lifecycle** (…→ overdue → missed) that flows into gradebook,
   weekly reports, and streaks.
5. **Zero disruption** to existing baked-date assignments during migration.

## 3. Architecture: policy resolves top-down, overridable per batch

```
Level 1  Template default   DayPlan item                (author sets a sensible default)
Level 2  Batch override     BatchOffering.policyOverrides (admin's main lever — per situation)
Level 3  Per-student grant  CurriculumEnrollment          (extend / reopen one student)
```

Resolution order (most specific wins): **student grant → batch override → template default.**
Same content → different policy per batch → no clones.

## 4. Data model changes (all additive)

### 4.1 `DayPlan` item (template default)
Add to the item sub-schema in `src/models/DayPlan.ts`:
```ts
dueOffsetDays: { type: Number, default: 0 },   // due = day's date + this
dueTime:       { type: String, default: '23:59' },
latePolicy:    { type: String, enum: ['open','grace','hard_lock'], default: 'grace' },
graceDays:     { type: Number, default: 2 },   // only for 'grace'
penaltyPct:    { type: Number, default: 0 },   // late penalty %
```

### 4.2 `BatchOffering` (per-batch override)
Add a nullable overrides array in `src/models/BatchOffering.ts` (null field = inherit template):
```ts
policyOverrides: [{
  dayNumber?:      Number,          // target a whole day…
  itemId?:         String,          // …or one item
  latePolicy?:     'open'|'grace'|'hard_lock',
  graceDays?:      Number,
  dueOffsetDays?:  Number,
  dueDateAbsolute?: Date,           // escape hatch: pin an exact deadline for this batch
}]
```
`effectiveItemsForDay(templateItems, offering, dayNumber)` already merges offering
overrides for add/remove — extend it to also fold `policyOverrides` onto each item.

### 4.3 New: per-student item status (durable)
New model `src/models/PlanItemStatus.ts` (or extend `CurriculumEnrollment.completedItems`):
```ts
{
  tenantId, studentId, enrollmentId,
  itemKey:   String,   // `${curriculumId}:${dayNumber}:${itemId}` — stable identity
  kind:      String,   // assignment | quiz | codeSnippet | mockInterview
  sourceId:  ObjectId, // the content doc
  status:    'not_started'|'in_progress'|'submitted'|'graded'|'overdue'|'missed',
  dueAt:     Date,     // resolved deadline snapshot (for reporting)
  submittedAt?: Date,
  extendedTo?:  Date,  // per-student grant (Level 3)
  updatedAt: Date,
}
```
Index `{ tenantId, studentId, status }` and `{ enrollmentId, itemKey }` (unique).

## 5. Policy resolution helper (one place)

New `src/services/deadlinePolicyService.ts`:
```ts
resolvePolicy(item, offering, enrollment) -> {
  dueAt: Date,        // workingDateForDay(offering.startDate, dayNumber, holidays)
                      //   + dueOffsetDays @ dueTime, then student grant / absolute override
  latePolicy, graceDays, penaltyPct,
  lateUntil: Date,    // dueAt + graceDays (for 'grace'); == dueAt for 'hard_lock'; null for 'open'
}
computeStatus(policy, submission, now) -> 'not_started'|'in_progress'|'submitted'|'graded'|'overdue'|'missed'
```
Reuses `workingDateForDay` + `holidaySet(offering)` (already in `batchOfferingController.ts`).

## 6. Status lifecycle

```
not_started → in_progress → submitted → graded
        └─ now > dueAt, nothing submitted ─→ overdue
                 └─ 'grace':     now > dueAt+graceDays ─→ missed (scored 0)
                    'hard_lock': now > dueAt            ─→ missed (submission closed)
                    'open':      never → missed (nudge only)
```
- On submit, if `dueAt < submittedAt <= lateUntil` → mark `late`, apply `penaltyPct`
  (mirror the existing standalone `'late'` submission-status behavior).
- `hard_lock`: the submit endpoints reject after `dueAt` with a clear message.

## 7. How the status flips (hybrid — live + durable)

1. **Lazy on read** — `getMyTasks` / `getStudentDayPlan` / day view call
   `computeStatus(...)` so the UI is always correct instantly (no job needed for UI).
   Replace the current `overdue: day < currentDay` (pace) with deadline-based status.
2. **Nightly sweep** — cron `src/jobs/planDeadlineSweep.ts`: for active enrollments,
   find items past `lateUntil` with no submission → **persist `missed`** into
   `PlanItemStatus`. This is what makes gradebook / weekly report / streaks durable.
   Idempotent; safe to re-run. Re-resolves and clears wrongly-missed rows if an admin
   softens the policy or extends.

## 8. API changes

- `PATCH /batch-offerings/:id/policy` — set/replace `policyOverrides` (admin).
- `POST  /batch-offerings/:id/extend` — `{ dayNumber?|itemId?, days }` bulk extend a batch
  (mirror the quiz `reassignNonAttendees` + `extendDays` pattern).
- `POST  /enrollments/:id/grant` — `{ itemKey, extendedTo }` reopen/extend one student.
- Assignment/Quiz **submit** endpoints: consult `resolvePolicy` → allow/late/reject.
- `getMyTasks` returns `status` + `dueAt` (resolved), not just the pace `overdue`.

## 9. UI changes

- **Authoring (curriculum item):** a "Deadline & Late Policy" control → `dueOffsetDays`,
  `dueTime`, `latePolicy`, `graceDays`, `penaltyPct` (template defaults).
- **Batch offering screen:** same control as a per-batch **override** + an **Extend/Reopen**
  action. Because status is persisted, show `submitted / overdue / missed` counts per item
  so the admin can decide whether to soften.
- **Student My Tasks / Day view:** status chip (Due today / Overdue / Missed / Submitted),
  `hard_lock` disables the launch button after deadline with an explanation.

## 10. Migration & backward compatibility (phased, non-disruptive)

- **Existing baked-date assignments/quizzes keep working unchanged.** The new policy path
  is only active for items delivered through a `BatchOffering`/`DayPlan`.
- Migration treats a baked `dueDate` as "content + one implicit schedule row" so nothing
  breaks mid-flight.
- Backfill: for each existing plan enrollment, lazily create `PlanItemStatus` on first read.

## 11. Rollout phases

- **P1 — Read model:** `resolvePolicy` + `computeStatus`; wire into `getMyTasks` /
  `getStudentDayPlan` (deadline-based status, still no persistence). *Ships value with no
  schema risk.*
- **P2 — Policy fields + authoring UI:** DayPlan defaults + BatchOffering overrides + the
  "Deadline & Late Policy" control.
- **P3 — Enforcement:** submit endpoints honor `hard_lock` / `grace` + penalty.
- **P4 — Durable status:** `PlanItemStatus` + nightly sweep → gradebook / weekly report /
  streaks count `missed`.
- **P5 — Admin ops:** Extend/Reopen (batch + per-student), at-risk counts on the offering.

## 12. Reuses (already built — this is mostly wiring)

- `workingDateForDay` + `holidaySet` (per-batch date) — `batchOfferingController.ts`.
- `effectiveItemsForDay` (offering override merge) — extend for policy.
- Submission `'late'` status + penalty — standalone assignment flow.
- Quiz `reassignNonAttendees` + `extendDays` — the Extend/Reopen pattern.
- `resolveModuleStatuses` / `itemDone` — completion signals feed `computeStatus`.

## 13. Open decisions

1. `PlanItemStatus` as a **new collection** vs. **extending `CurriculumEnrollment.completedItems`**
   (new collection recommended — cleaner indexing for reports).
2. Default template `latePolicy` — recommend **`grace` (2 days, 0% penalty)** as the friendly default.
3. Does `hard_lock` **auto-grade 0**, or just close submission and leave grading to the
   instructor? (Recommend auto-0 with an instructor override.)
