# Skill DNA evidence calibration audit

Branch `new_cp_concept`, certified backbone `f206236c`. Audit only: no production weight, threshold, composer,
backbone or content change.

Reproduce:

```
cd server
npx ts-node src/scripts/auditEvidenceCalibration.ts --timeline    # full report, no database
npx jest src/tests/evidenceCalibrationAudit.test.ts               # pins today's behaviour
```

The simulator (`src/tests/evidenceCalibration/simulator.ts`) uses the production functions unchanged:
`evidenceWeightFor`, `aggregate`, `stateForScore`, `stableShuffle` and `composeUnits` with the frozen days as
history. It runs on the certified 346 units and the real checkpoint question map
(`src/tests/fixtures/evidence/checkpoint-questions.json`: ids, primary skill, difficulty, option count; no answers).

## 1. The pipeline

```
item (Skill Check item | checkpoint question | interview question)
  → graded answer (earned / max)
  → StudentSkillEvidence row: performance, evidenceWeight = relationship × difficulty × source
  → aggregate(all rows of the skill): score = Σ(p·w)/Σw × 100; confidence from Σw and distinct items
  → StudentSkillProfile (score, confidence)
  → stateForScore: ≤39 FOUNDATION_REQUIRED, ≤59 GUIDED, ≤74 STANDARD, ≤84 REVISION, else VERIFIED;
    LOW confidence caps at STANDARD; MEDIUM and HIGH are "confident enough"
  → foundationProfileService → composeUnits / recomposeFutureDays
```

Confidence: MEDIUM at effective weight ≥ 3; HIGH at ≥ 7 with ≥ 3 distinct items. It never looks at the score.
Every row counts forever and equally: **no recency**, no decay, no superseding. The only deletions are QA/reset
scripts.

## 2. Evidence sources

| Source | Written by | Weight per item | Confidence contribution | Recency | Repeats | Maximum effect | Journey trigger |
|---|---|---|---|---|---|---|---|
| Skill Check / diagnostic (`PERSONALIZED_ASSESSMENT`) | skillDnaService.projectAssessmentToSkillDna | EASY 0.85, MEDIUM 1.0, HARD 1.15 (secondary ×0.25) | 4 items/skill ≈ 3.7 → MEDIUM from one sitting | none | each attempt adds rows (unique per assessment+item+skill) | any state, in one sitting | DIAGNOSTIC_COMPLETED → recompose |
| Reassessment (a later Skill Check attempt) | same | same | adds to the earlier attempt's weight | none: averaged with the first attempt | new attempt = new rows | blends; cannot erase the first sitting | DIAGNOSTIC_COMPLETED → recompose |
| Checkpoint question on a unit day (`MODULE_ASSESSMENT`, via quizSkillBridge) | moduleAssessmentEvidenceService | **0.5** (all 812 questions are MEDIUM, 1 mark, single-answer, 4 options) | 6 answers = 3 → MEDIUM; 14 answers → HIGH | none | quizzes not retakeable; one row per question per attempt | any state, including VERIFIED at MEDIUM | MODULE_ASSESSMENT_COMPLETED → recompose, after every checkpoint |
| Checkpoints on practice, debugging and project days (40 + 34 + 2 units) | same | 0.5, **same kind as a lesson checkpoint** | same | none | same | same | same |
| Milestone checkpoints (7 units, up to 9 questions) | same | 0.5 | up to 4 answers on one skill in one sitting (weight 2) | none | not retakeable | same | same |
| Module assessment (TOPIC-engine modules) | moduleAssessmentService | 0.5 | same | none | retake = new rows | any state | MODULE_ASSESSMENT_COMPLETED |
| Mock interview (`MOCK_INTERVIEW`) | interviewIntelligenceService | 0.6 × difficulty | adds weight | none | per interview | any state | **none published**: Skill DNA changes, the journey only at the next trigger |
| Practice / debugging content, lesson completion | — | **no evidence** | — | — | — | — | none |
| Coding assignments (the five spine assignments, auto-graded with hidden tests) | — | **no evidence** | — | — | — | — | none |
| Project assignments (29, rubric-reviewed written submissions) | — | **no evidence** | — | — | — | — | `PROJECT_EVALUATED` is a declared trigger that **nothing publishes** |

Mapping quality (Savas, certified set): 736 of 812 checkpoint questions carry a PRIMARY skill; **76 carry none** and
write nothing; there are **no SECONDARY mappings**. Mapped checkpoint questions per focus skill across the whole
curriculum: PROGRAMMING_FUNDAMENTALS 9, CONDITIONALS_BASICS 18, LOOPS_BASICS 17, FUNCTIONS_BASICS 23, DSA_ARRAYS 8,
SHELL_COMMANDS 14, PROBLEM_SOLVING 27, SQL_BASICS 4.

## 3. Answers needed to move a state (consecutive MEDIUM checkpoint answers)

| Prior | All right: GUIDED / STANDARD / REVISION / VERIFIED | All wrong | Confidence |
|---|---|---|---|
| **No evidence** (conditions, loops, functions, arrays, SQL are not on the Skill Check) | — / **1** (LOW cap) / — / **6** | FOUNDATION_REQUIRED after 1 | LOW 1, MEDIUM 6, HIGH 14 |
| Skill Check 0 of 4 (PROGRAMMING_FUNDAMENTALS: EASY, EASY, HARD, EASY) | 5 / 11 / 22 / **41** | stays FOUNDATION_REQUIRED | already MEDIUM; HIGH after 7 |
| Skill Check 0 of 4 (SHELL_COMMANDS) | 6 / 12 / 23 / 42 | stays | same |
| Skill Check 2 of 4 | (GUIDED already) 3 / 9 / 19 | FOUNDATION_REQUIRED after 2 | same |
| Skill Check 4 of 4 | VERIFIED already | REVISION 2, STANDARD 3, GUIDED 6, FOUNDATION_REQUIRED 12 | same |

Direct transitions that cannot happen:
- **Unmeasured to GUIDED, or to REVISION.** An unmeasured skill jumps straight to STANDARD on one right answer (LOW caps it) or to FOUNDATION_REQUIRED on one wrong one. It stays STANDARD through five right answers, then becomes VERIFIED on the sixth, when confidence reaches MEDIUM.
- **Past the curriculum's supply.** PROGRAMMING_FUNDAMENTALS measured 0 by the Skill Check needs 41 right answers, but the curriculum holds 9, so coursework caps it at GUIDED. SHELL_COMMANDS: 42 needed, 14 exist. SQL_BASICS (4 questions) and DSA_ARRAYS (8) can never leave LOW from checkpoints alone, so they are capped at STANDARD.

## 4. Simulations (ninety days each, recomposed as production recomposes)

| Learner | Focus-skill outcome | Recompositions | Lessons / practice removed | Coding assignments removed | Backbone treatment changes | Backbone ever missing |
|---|---|---|---|---|---|---|
| A beginner, ~30% at random | all FOUNDATION_REQUIRED | 13 | 9 / 1 | none | 0 | never |
| B beginner, learns gradually | functions REVISION (day 51), conditions/loops GUIDED, PROBLEM_SOLVING STANDARD, PF FOUNDATION_REQUIRED | 39 | 7 / 0 | none | 0 | never |
| C lessons right, practical wrong | **functions VERIFIED day 55 with no practical evidence**; conditions VERIFIED day 38 then REVISION→STANDARD once its debugging/practice checkpoints were wrong | 27 | 29 / 5 | **Functions** | 3 | never |
| D beginner, all right | **conditions VERIFIED day 42, loops day 50, functions day 53 (100/MEDIUM)**; PF only GUIDED, SHELL GUIDED | 32 | 34 / 6 | **Conditions, Loops, Functions** | 3 (FULL→CHALLENGE) | never |
| E partial, ~70% | conditions VERIFIED day 37, loops day 50; PF STANDARD | 26 | 9 / 2 | **Conditions, Loops** | 2 | never |
| F @70 (10 items/skill) | all STANDARD, PROBLEM_SOLVING REVISION day 43; nothing VERIFIED | 25 | 52 / 12 (compressed plan evolving) | none | 0 | never |
| G @78 (18 items/skill) | stays REVISION throughout | 29 | 40 / 7 | none | 0 | never |
| H very strong | stays VERIFIED | 28 | 75 / 17 | none on plan (0/5 from the start, by design) | 0 | never |
| I always option A | ~25% correct; all FOUNDATION_REQUIRED (loops GUIDED on one day only) | 16 | 9 / 1 | none | 0 | never |
| J alternating | GUIDED/FOUNDATION_REQUIRED | 21 | 9 / 1 | none | 0 | never |
| K wrong to day 20, then right | conditions/loops/functions VERIFIED (their evidence all came after day 20); SHELL and PROBLEM_SOLVING stuck at 0 | 23 | 24 / 6 | **Conditions, Loops, Functions** | 3 | never |
| L right to day 30, then wrong | spine skills FOUNDATION_REQUIRED; the early right answers on PROBLEM_SOLVING/SHELL keep them STANDARD/GUIDED | 25 | 21 / 2 | none | 0 | never |

The path that removes a coding assignment (learner D, Conditions):

| Day | Unit | Evidence | Score, confidence, state | Consequence |
|---|---|---|---|---|
| 40 | Conditions: `if` (lesson) | 2/2 | unmeasured → 100/LOW **STANDARD** | recomposed, nothing removed (LOW: lessons still owed) |
| 41 | `else` (lesson) | 2/2 | 100/LOW STANDARD | — |
| 42 | boolean operators (lesson) | 2/2 | 100/**MEDIUM VERIFIED** | recomposed: remaining lesson, **Conditions practice and its coding assignment removed**; backbone Conditions FULL → CHALLENGE (debugging only) |

The same happens for Loops, verified on its debugging day (day 50) after five one-question lessons, and for
Functions on day 53. The learner answered six multiple-choice recall questions right straight after being taught
them. Nothing in Skill DNA distinguishes that from a practical demonstration.

## 5. Checkpoint versus practical evidence

**Not distinguished.** A row records `sourceType` (PERSONALIZED_ASSESSMENT, MODULE_ASSESSMENT or MOCK_INTERVIEW)
and the item, but `aggregate` and `stateForScore` read only performance, weight and distinct items. Consider:
- a recall question right after a lesson;
- the multiple-choice checkpoint on a practice day;
- a milestone checkpoint.

All three are the same `MODULE_ASSESSMENT` observation at 0.5. The activities that *are* practical (coding
assignments with hidden tests, reviewed projects) contribute nothing.

The smallest place the distinction could live, without touching the composer:

1. **Where the kind is known:** at projection. `quizSkillBridge` knows the unit (and its `unitType`) the checkpoint belongs to; a future assignment/project projection knows it is applied work. A row field such as `evidenceKind: DIAGNOSTIC | UNDERSTANDING | APPLIED` is written there.
2. **Where it acts:** `aggregate`/`recomputeStudentSkills` stores, per skill, whether any DIAGNOSTIC or APPLIED evidence exists. `stateForScore` gains the same kind of cap it already applies for LOW confidence: understanding-only evidence caps the state at STANDARD. The composer keeps reading states exactly as today.

## 6. Assignments

The five coding assignments (Variables, Conditions, Loops, Functions, Arrays) and all 29 project assignments
create **no SkillEvidence** on submission or grading (`submissionService` / `submissionController` never touch
evidence; `PROJECT_EVALUATED` is never published). **This is an evidence-model gap:** the strongest demonstration
of a skill the product records carries no weight. Meanwhile the checkpoint that precedes it can remove the
assignment from the journey.

## 7. False positives (VERIFIED on weak evidence)

1. **Six recall answers.** Any skill the Skill Check did not measure (conditions, loops, functions, arrays, SQL, Git…) becomes VERIFIED at MEDIUM after six right checkpoint answers. That's three lesson days for Conditions and Functions (2 questions each), or six single-question Loops days (verified on the debugging day, before practice).
2. **No practical demonstration.** Learner C reached Functions VERIFIED on lessons alone. The practice day whose wrong answers would have pulled it back was removed by the same recomposition.
3. **One burst.** A milestone checkpoint gives up to 4 answers on one skill in a single sitting (weight 2). Combined with two lesson answers, that is VERIFIED within two days.
4. **One narrow subtopic.** Distinct-item breadth only gates HIGH, not MEDIUM, so MEDIUM VERIFIED can rest on 6 questions from three lessons.
5. **Stale mastery.** With no recency, a skill verified early stays high when later work goes wrong, until enough wrong answers outweigh it (learner C needed its debugging and practice days to arrive). Once practice has been removed, those contradicting answers never arrive.
6. **Guessing does not reach it:** always-first-option lands at ~25% under the stable shuffle (learner I). The checkpoint security fix holds.

## 8. False negatives (low Skill DNA despite real capability)

1. **Coding assignments and projects count for nothing.** A beginner who fails the Skill Check but passes all five coding assignments and the projects is judged only on multiple-choice answers.
2. **Anchoring by the diagnostic.** A zero on the 4-item Skill Check (weight ≈ 3.7) needs 41 perfect checkpoint answers to be overturned. PROGRAMMING_FUNDAMENTALS has 9 in the whole curriculum and SHELL_COMMANDS 14, so learner D, right on everything, ends PF GUIDED and SHELL GUIDED. Learner K ends SHELL and PROBLEM_SOLVING at 0 despite 70 days of right answers, because the evidence for those skills came before day 20.
3. **Unmeasurable skills.** SQL_BASICS (4 mapped questions) and DSA_ARRAYS (8) cannot reach MEDIUM from coursework, so they stay capped at STANDARD, and SQL_BASICS is never measured for a beginner (its questions sit on units a beginner is not scheduled). 76 checkpoint questions have no skill mapping at all.
4. **Mock interview evidence moves Skill DNA but publishes no journey trigger;** the journey only reflects it at the next checkpoint or diagnostic.

## 9. Recommendation

**Classification: E — multiple.** Specifically C (source strength should be distinguished) and D (practical evidence
is missing), with a B-grade coverage imbalance (per-skill question supply versus the diagnostic anchor).
**Not A:** the current calibration lets six recall answers remove practical work.

Smallest proposed model (not implemented):

1. **Evidence kind on each row**, set at projection:
   - `DIAGNOSTIC`: Skill Check and reassessment.
   - `UNDERSTANDING`: checkpoint questions, including those on practice days, which are still multiple choice.
   - `APPLIED`: graded coding assignments and reviewed projects.
   - `MOCK_INTERVIEW` stays its own source.
2. **One state rule beside the LOW-confidence cap:** a skill whose evidence is UNDERSTANDING-only is capped at STANDARD. REVISION and VERIFIED require DIAGNOSTIC or APPLIED evidence. Weights stay as they are. The composer, backbone and recomposition are untouched: a checkpoint-only learner stays STANDARD, and the backbone keeps the practice and the coding assignment.
3. **Applied evidence from the two activities that already produce grades.**
   - A coding assignment's final auto-graded score (hidden tests), per submission, for the unit's skills, at source weight 1.0 (as a marked paper).
   - A reviewed project's rubric score, for its unit's skills.
   - Both are idempotent per submission and publish `PROJECT_EVALUATED` (already a journey trigger).
4. **Separately, and only after 1–3 are measured:** decide whether the diagnostic anchor should decay (recency) or whether per-skill checkpoint supply should be balanced. The simulator above re-measures any proposal.

Security was not touched: answer keys, stable unbiased option order, tenant isolation, attempt ownership and hidden
tests are as certified.
