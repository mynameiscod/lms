# Year 1 — Final Integration and Acceptance

**Tenant** `69eccfcec11281afe4edce88` (codebegun, local development)
**Branch** `new_cp_concept`
**Date** 2026-09-09

---

## Verdict

**YEAR 1: READY**

Every acceptance target is met on the numbers below. Two defects were found during this pass and
both are fixed; three behaviours that looked like defects turned out to be deliberate, documented
rules and are recorded here so they are not re-litigated. Nothing is left open that would change a
student's measurement, plan or history.

---

## 1. Legacy retirement

The 215 legacy Foundation mappings that no Golden item cited are retired, so new Foundation
selection draws only on the Golden bank.

| | before | after |
|---|---|---|
| active Golden PRIMARY | 1650 | **1650** |
| active legacy Foundation | 215 | **0** |
| retired legacy mappings (all causes) | 151 | 366 |
| `Question` rows | 366 | **366** — content never deleted |
| `PersonalizedAssessment` rows | 3 | **3** — no history rewritten |
| `StudentSkillEvidence` rows | 70 | **70** — untouched |
| `StudentSkillProfile` rows | 17 | **17**, same `updatedAt` — untouched |

Retirement deactivates mappings only. Every retired row is stamped `updatedBy:
foundation-legacy-retirement`, so `--restore --apply` reactivates exactly those and cannot
resurrect the 151 the importer retired for a different reason, nor anything an admin switched off
by hand. Both directions are idempotent: the filter requires the state it is changing.

**The known-bad `.lower()` question** (`95c3883661632872716f6039`) is verified unreachable —
`findEvidenceCandidates` across all 33 Foundation skills does not return it. Its `Question` row is
deliberately still present; only the mapping is off.

> Worth recording: the stored row is worse than the Phase-2.5 note said. Three of its four options
> are flagged `isCorrect`, not one. The prepared `fixPythonLowerAnswerKey.ts` was written against a
> two-option premise and **should not be run** — the question is retired and superseded by Golden
> items, so the repair is moot.

**Coverage after retirement**, through `findEvidenceCandidates` and `distinctPrimaryCount` — the
generator's own functions:

```
Foundation assessable skills : 33      Measurable : 33      Insufficient : 0
source families counted      : assessment_item 1650   (no legacy family remains)
questions needed to reach the floor : 0
```

---

## 2. Diagnostic QA — 100/100

Five students across four answer modes, plus retakes and determinism.
Script: `server/src/scripts/year1DiagnosticQa.ts`.

| check | result |
|---|---|
| papers fill every slot | 32/32 on every paper, 0 shortfalls, 0 difficulty fallbacks |
| only Golden questions selected | every item on every paper |
| no item repeated within a paper | 0 repeats |
| no fact repeated within a paper | 0 repeats, 32 distinct facts per paper |
| retake freshness | 0 items and 0 facts repeated from attempt 1 |
| difficulty policy respected | every item's stored 1–5 matches the band its slot asked for; mix E19/M11/H2 against a policy of 60/35/5 |
| scoring correct | all-correct 32/32, all-wrong 0/32, mixed 16/32, unanswered 0/32 — all graded, none skipped |
| confidence correct | every profile's score and confidence recomputed independently from the evidence rows and matched |
| `notMeasuredSkills` correct | empty, and correctly so — see §6 |
| deterministic generation | same student + attempt ⇒ identical paper; different students ⇒ different papers |
| no profile written for an unasked skill | held on every paper |

---

## 3. Skill DNA and personalization — 462/462

Seven synthetic students: beginner, strong programmer, mixed, web direction, AI/ML direction,
software-development direction, undecided. Evidence is built by **answering scoped papers through
the real generator**, never by writing profile rows.
Script: `server/src/scripts/year1PersonalizationQa.ts`.

The persisted flow was exercised end to end for each:
`buildPersonalizedAssessment → PersonalizedAssessment → gradeSubmittedAnswers →
projectAssessmentToSkillDna → StudentSkillEvidence → StudentSkillProfile → generateAssignment →
StudentCurriculumAssignment`.

| requirement | how it was proved |
|---|---|
| not assessed ≠ weak | an unmeasured skill has **no profile row at all** and is never `FOUNDATION_REQUIRED` |
| not exposed ≠ zero mastery | `NOT_EXPOSED` topics carry `scoreAtAssignment: null` and reason `NOT_YET_EXPOSED`, and are taught rather than marked failed |
| strong reduces remediation | every topic whose governing score ≥ 85 lands on `VERIFIED`/`REVISION` with ≤ 2 practice items; `VERIFIED` is never mandatory and carries 0 practice |
| weak produces remediation | every topic whose governing score ≤ 39 lands on `FOUNDATION_REQUIRED`, FOUNDATION depth, ≥ 5 practice items |
| direction personalizes | off-direction topics become `NOT_RELEVANT` with reason `OUTSIDE_DIRECTION` and readable text — set aside and visible, not deleted |
| direction never bypasses prerequisites | with a chosen web direction and failed `PROGRAMMING_FUNDAMENTALS`, `T_JS_DOM` stays `LOCKED` with `lockedBy: PROGRAMMING_FUNDAMENTALS` |
| optional stays optional | no topic the curriculum marks optional is made mandatory by a low score |

Plan shapes produced:

```
beginner        {NOT_EXPOSED:10, LOCKED:13, FOUNDATION_REQUIRED:1, NOT_RELEVANT:1}
strong          {NOT_EXPOSED:14, LOCKED:4,  VERIFIED:2,            NOT_RELEVANT:5}
mixed           {NOT_EXPOSED:13, LOCKED:5,  FOUNDATION_REQUIRED:1, GUIDED:1, NOT_RELEVANT:5}
web             {NOT_EXPOSED:12, LOCKED:9,  VERIFIED:1,            NOT_RELEVANT:3}
ai/ml           {NOT_EXPOSED:14, LOCKED:6,  VERIFIED:2,            NOT_RELEVANT:3}
backend         {NOT_EXPOSED:14, LOCKED:4,  GUIDED:2,              NOT_RELEVANT:5}
undecided       {NOT_EXPOSED:14, LOCKED:10,                        NOT_RELEVANT:1}
```

---

## 4. Learning and reassessment — 26/26, both directions

Script: `server/src/scripts/year1E2E.ts`, run for a chosen direction and for an undecided student.

```
profile → direction → diagnostic → Skill DNA → journey → content → practice
→ skill check → evidence → updated Skill DNA → regenerated journey → reassessment → completion
```

- Onboarding runs through `updateCareerContext`, the real service, to `onboardingCompleted`.
- Diagnostic: 32/32 filled, all Golden, 8 of 33 skills measured, 25 correctly left unmeasured.
- Journey: 25 topics, every one carrying a reason and reason text; content resolved for all
  11 teachable topics; 0 unmapped skills.
- Skill check on the weakest skill: `C_BASICS 0 → 50`, evidence 4 → 8 observations, and **no skill
  the paper did not ask about moved**.
- Replan: version 2 produced, exactly 1 `ACTIVE` and 1 `SUPERSEDED` — the old plan is kept, not
  deleted. Improving the prerequisite moved `T_CONDITIONS` and `T_C_BASICS` from `LOCKED` to
  `FOUNDATION_REQUIRED` and `T_CAPSTONE` from `LOCKED` to `NOT_EXPOSED`.
- Reassessment: opened, 32 items, **0 repeated questions and 0 repeated facts** against 40 facts
  already seen, all Golden, 32 distinct families.

### What the engine does and does not consume

Stated plainly rather than implied:

| Golden field | consumed by the engine? | effect |
|---|---|---|
| `factId` | **yes** — written into `AssessmentItem.factKeys` | drives `distinctPrimaryCount`, the no-repeated-fact rule within a paper, and retake freshness |
| `familyId` | **no** — stored in `golden.familyId`, read by nothing | **no gap**: every family sits inside exactly one fact (verified across all 497 families), so excluding by fact is strictly stronger. Observed: 32 items from 32 distinct families with no family rule in play |
| `reassessmentGroup` | **no** — stored, read by nothing | **a real gap, not Year-1 blocking**. It exists to let a check-in re-measure the *same construct* with a *different* item. Today a check-in maximises novelty instead: freshness is guaranteed, like-for-like comparison at construct level is not. Skill-level comparability — which is what `StudentSkillProfile` records and what before/after snapshots compare — is unaffected. Deferring is safe; implementing it would change which items a check-in prefers, which is a product decision, not a correctness fix |

---

## 5. Defects found and fixed

### 5.1 A retake could re-ask a fact the student had already answered

`buildPersonalizedAssessment` has always known how to avoid re-asking a fact — `alreadySeen`
checks `seenFactKeys` — but **neither production caller ever passed them**. Both the diagnostic
start controller and `startReassessment` passed `seenSourceIds` alone.

That is harmless on a bank where one question is one piece of knowledge. The Foundation Golden
bank is not: 1,650 items over 480 facts, **3.4 questions per fact on average and up to 8**. A
retake excluding only ids can hand a student a different item resting on the fact they answered
last month, and the remembered answer is recorded as improvement — the exact failure the service's
own comment says must not happen.

**Fix** — `seenFactKeysFor(tenantId, items)` in `personalizedAssessmentService`, reading prior
papers' facts back through the registry (one batched query per source family), wired into both
call sites. Content with no facts contributes nothing, so hand-authored banks are unaffected.

Verified: a check-in after two prior papers repeats 0 of 40 seen facts.

### 5.2 Choosing a direction removed the ability to check in

At the Foundation stage the stage skill set already overrides the role blueprint for paper
generation (`STAGE_SCOPE_OVERRIDES_ROLE = ['foundation', 'build']`). Role **readiness** had no
such rule: it stood the stage blueprint in only when *no* role was chosen. With this tenant's role
blueprints unpublished — deliberate, by `scopeTenantToFoundation --foundation-only` — a Foundation
student who named a direction got `ROLE_NOT_SELECTED`, an empty target plan and **no check-in at
all**, while an undecided classmate could open one. Naming where you are heading cost you a
measurement.

**Fix** — in `calculateStudentRoleReadiness`, an absent *or unpublished* role blueprint falls back
to the stage blueprint, the same substitution the no-role branch already makes. It fires only where
the answer today is "unavailable", so nothing that currently works changes, and a published role
blueprint still wins whenever there is one.

Verified: both `FRONTEND_ENGINEER` and `NOT_SURE` now open a check-in, reporting against
`STAGE:FOUNDATION` with 33 skills.

> The first attempt at this fix guarded on `!blueprint` and never fired, because
> `getRoleSkillBlueprint` returns drafts and the published check sits further down. Recorded
> because the symptom — a fix that typechecks, deploys and does nothing — is easy to miss.

---

## 6. Behaviours that are correct and were nearly reported as defects

Each of these failed a first-draft assertion. In every case the engine was right and the assertion
encoded an assumption the engine deliberately contradicts.

1. **`notMeasuredSkills` is empty.** It means `INSUFFICIENT_EVIDENCE` only — skills the bank cannot
   measure — not "not chosen this sitting". Empty is the correct post-import result. A skill left
   off a 32-slot paper covering 8 of 33 is handled by the separate rule that no profile is written
   for it.

2. **A multi-skill topic is governed by the skill we know least about.** `T_VARIABLES` reads
   `NOT_EXPOSED` even for a student scoring 100 on `PROGRAMMING_FUNDAMENTALS`, because
   `PYTHON_BASICS` was never measured. Documented in `governingBelief`, and conservative in the
   right direction.

3. **An unmet prerequisite outranks any score, and a never-measured prerequisite counts as unmet.**
   A first plan is therefore heavily `LOCKED` until foundational skills are measured or taught —
   11 of 25 topics for the E2E student. The blocking topic is itself in the plan and taught first,
   and the locks clear as skills are demonstrated (11 → 8 after one skill check). Coherent, but the
   most likely thing to be mistaken for a bug by someone reading a first plan; worth a note in the
   student-facing copy rather than a code change.

`NOT_EXPOSED` and `FOUNDATION_REQUIRED` assign identical work — same depth, six practice items,
mandatory. Only the sentence shown to the student differs, which is the point: telling somebody
they failed something nobody asked them about would be a lie.

---

## 7. Regression

| target | required | observed |
|---|---|---|
| Golden Bank | 1650 | **1650** |
| skills | 33 | **33** |
| questions per skill | 50 | **50** — 0 skills off target |
| D1–D5 | 330 each | **330 / 330 / 330 / 330 / 330** |
| measurable | 33/33 | **33/33** |
| legacy reachable | 0 | **0** |
| student history destroyed | 0 | **0** — 70 evidence rows, 17 profiles, 3 papers, all intact |
| Golden validation failures | 0 | **0** — 58/58 checks pass |

**Automated tests**, run from the monorepo root (`npm test -w server`):

```
Test Suites: 2 skipped, 123 passed, 123 of 125 total
Tests:       42 skipped, 2224 passed, 2266 total
```

No `npm ci` was run from `server/`. This is an npm workspaces monorepo that hoists to the root;
installing from the workspace directory empties it and deletes tracked files.

---

## 8. Not blocking, but worth knowing

1. **D4 and D5 cannot be requested separately.** The generator asks for `EASY`/`MEDIUM`/`HARD`, and
   the registry maps 1–2 → EASY, 3 → MEDIUM, 4–5 → HARD. The bank's distinguishing bands — D4
   diagnosis, D5 transfer — are both `HARD`, and `FOUNDATION_V1` weights `HARD` at 5%, so a 32-slot
   paper serves roughly 2 of them. Faithful to the policy, and a five-band request vocabulary would
   be needed to ask for D4 rather than D5.

2. **`reassessmentGroup` is unused** — see §4.

3. **Content library coverage.** All 11 teachable topics resolved content for the E2E student and
   0 skills came back unmapped, so this tenant is authored well enough for Year 1. A tenant with an
   empty library still produces a correct plan, depths and practice counts, and the resolver
   reports the gap rather than failing.

---

## 9. Artifacts and scripts

| path | purpose |
|---|---|
| `docs/audit/foundation-golden-bank-master.csv` | the frozen 1,650-question bank |
| `docs/audit/foundation-golden-bank-final-validation.csv` | 58 checks over the bank |
| `docs/audit/foundation-assessment-coverage.csv` | per-skill coverage, regenerated after retirement |
| `server/src/scripts/retireLegacyFoundationEvidence.ts` | reversible, idempotent legacy retirement |
| `server/src/scripts/year1DiagnosticQa.ts` | diagnostic matrix, 100 checks |
| `server/src/scripts/year1PersonalizationQa.ts` | seven personas, 462 checks |
| `server/src/scripts/year1E2E.ts` | full journey, 26 checks, per direction |
| `server/src/scripts/importGoldenBank.ts` | the import, dry-run by default |
| `server/src/scripts/goldenBankReachability.ts` | generator reachability |

Every QA script creates its own synthetic students and removes them; no pre-existing student is
read or written. Re-running any of them leaves the database exactly as it found it.

---

**YEAR 1: READY**
