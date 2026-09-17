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

Smallest proposed model (implemented afterwards; see section 10):

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

## 10. Implemented: evidence source strength and applied mastery

Commits f2250373 (kinds), 96b410eb (cap), 1d4b1556 (token tenant on submissions), b8bf7b4e (applied evidence), then
the simulation, audit and certification gate. Weights, bands, confidence thresholds, recency, the diagnostic anchor,
question supply, the composer, the backbone and the ninety days are unchanged.

**Kinds.** Every row is DIAGNOSTIC (Skill Check, reassessment, mock interview), UNDERSTANDING (every checkpoint
question) or APPLIED (a coding assignment auto-graded on a real runner; a coding or project submission graded through
the authorised grading endpoint). New rows record `evidenceKind`; older rows are read by `sourceType`
(`evidenceKindOf`), so nothing is rewritten and no migration was needed. Two source types were added at weight 1.0:
`CODING_ASSIGNMENT`, `PROJECT_EVALUATION`.

A mock interview is read as DIAGNOSTIC, not as a fourth kind. It is a measured assessment outside the coursework and it
has always counted toward every state, so it keeps that behaviour: no cap, weight 0.6, no trigger. The open question is
that a spoken explanation is not working code.

**The cap.** If every row behind a skill is UNDERSTANDING, `stateForScore` stops at STANDARD. The stored score and
confidence stay as measured. `buildFoundationProfile` flags the skill (`understandingOnly`), and the composer's state
reads pass the flag through. A diagnostic or applied row lifts the cap. The cap never lowers GUIDED or
FOUNDATION_REQUIRED, and it applies in addition to the LOW-confidence cap.

**Applied evidence** (`appliedEvidenceService`):
- **Trust.** An auto-grade counts only when every test case was executed by Piston (`Submission.autoGradeTrusted`,
  set with the grade). A simulated run, a run the grader could not finish, and HTML/CSS token matching write nothing.
- **Grades.** A project submission is not evaluated; its authorised grade is. Performance is the rubric fraction when
  the rubric was scored, otherwise (auto + manual) ÷ totalPoints. The late penalty is not applied, and failed grades
  are recorded as given.
- **Identity.** One row per unit skill per submission attempt. A retry changes nothing, a regrade replaces, and a
  reattempt adds new evidence. Hidden tests, code and solutions are never stored.
- **Skills.** The assignment's `unitCode` names its unit. The unit's active, assessable, non-group skills each receive
  the unit-level grade. An unmapped unit records nothing and reports `UNMAPPED`.
- **Trigger.** An evaluation that changed evidence publishes `PROJECT_EVALUATED`; recomposition freezes completed days
  and today.
- **Security.** Tenant comes from the caller's token. Grading requires `grade_submissions`, a self-grade is refused,
  and no request field can claim a grade.

### Critical case (learner D, beginner, every checkpoint right)

| Skill | First day checkpoints alone are VERIFIED by score | Raw / confidence | Effective | Cap | Coding assignment BEFORE | AFTER |
|---|---|---|---|---|---|---|
| CONDITIONALS_BASICS | 41 (6 answers) | 100 / MEDIUM, VERIFIED | STANDARD | YES | removed | kept, worked day 43 |
| LOOPS_BASICS | 49 (6 answers) | 100 / MEDIUM, VERIFIED | STANDARD | YES | removed | kept, worked day 50 |
| FUNCTIONS_BASICS | 53 (6 answers) | 100 / MEDIUM, VERIFIED | STANDARD | YES | removed | kept, worked day 54 |
| DSA_ARRAYS | never (8 mapped questions stay LOW) | — | — | — | kept | kept, worked day 59 |

### Twelve learners, BEFORE → AFTER (final focus-skill states; coding assignments removed)

| Learner | Coding assignments removed | Notable state changes |
|---|---|---|
| A beginner weak | none → none | all FOUNDATION_REQUIRED, unchanged |
| B learns | none → none | CONDITIONALS GUIDED 58 → STANDARD 64 (graded work at 40–95%) |
| C lessons only, practical 20% | FUNCTIONS → none | FUNCTIONS VERIFIED 100 → GUIDED 58; CONDITIONALS STANDARD → GUIDED; DSA_ARRAYS GUIDED → FOUNDATION_REQUIRED |
| D all right, practical 100% | CONDITIONS, LOOPS, FUNCTIONS → none | spine VERIFIED either way, AFTER only once the work is graded |
| E partial | CONDITIONS, LOOPS → none | CONDITIONALS VERIFIED 88 → REVISION 84 |
| F @70 | none → none | unchanged (STANDARD; PROBLEM_SOLVING REVISION) |
| G @78 | none → none | unchanged (all REVISION) |
| H very strong | 0 on plan either way | unchanged (all VERIFIED, initial plan identical) |
| I always option A | none → none | all ≤ GUIDED |
| J alternating | none → none | DSA_ARRAYS FOUNDATION_REQUIRED → GUIDED |
| K wrong then right | CONDITIONS, LOOPS, FUNCTIONS → none | spine VERIFIED ~98 after graded work |
| L right then wrong | none → none | PROGRAMMING_FUNDAMENTALS GUIDED → FOUNDATION_REQUIRED (failed later work) |

The backbone was never missing, every plan was exactly ninety distinct days, and every run was deterministic. The
production certification gate `4d` runs these checks against the published inventory.

### Remaining calibration questions (measured, not changed)

1. **Compact treatment at STANDARD differs by topic.** A learner who is already STANDARD on conditions before the
   conditions lessons, from any source (a 7/10 diagnostic as well as capped checkpoints), gets
   `T_CONDITIONS_DEBUGGING` as the one compact treatment, not `T_CONDITIONS_PRACTICE`. The authored chain puts
   debugging before practice. Loops, functions and arrays keep their practice. In the real journey, the lessons come
   first, so learner D keeps the assignment.
2. **One failed applied grade can be outweighed.** Understanding plus a 20% coding grade lifts the cap. Six right
   answers plus 20% score 80 (REVISION), and eighteen right answers plus 20% score 92 (VERIFIED). Whether a failed
   applied grade should keep the cap, or carry more weight, is open.
3. **Live coding evidence needs Piston.** Without `PISTON_URL`, every auto-grade is simulated and records nothing; only
   reviewed grades produce applied evidence.
4. **Project grade timing.** The simulator assumes a project is graded the day it is worked. In production, it takes
   effect when a grader reviews it, which may be after later days are recomposed.
5. **Carried over from sections 8–9:** the diagnostic anchor (41 answers), per-skill question supply (SQL_BASICS 4,
   DSA_ARRAYS 8) and the 76 unmapped checkpoint questions.

## 11. Final calibration: failed practical work, the anchor, supply, unmapped questions, interviews

Commits:
- 56c96343: qualifying applied evidence
- 2c8dffd5: measurement
- 03a4615d: mock interview
- 0ff99b26: question mappings
- then the late-grade gate and the release test procedure

Weights, bands, confidence thresholds, the composer's rules, the backbone and the ninety days are unchanged.

### Failed applied evidence — fixed

Reproduced: 18 right checkpoint answers (weight 9) and one coding grade of 20% (weight 1) score 92, HIGH. Under a0cc9f2c
any APPLIED row lifted the understanding cap, so the skill was VERIFIED on a failed attempt.

**Rule.** A row *demonstrates* a skill when it is DIAGNOSTIC, or when it is APPLIED and its grade met the assignment's
own pass line. Every row still counts in the score at its performance. A skill with no demonstrating row is planned at
STANDARD at most (`skillDnaPolicy.demonstratesSkill`, `evidenceBasis.understandingOnly`).

**Pass line.** The pass line is `Assignment.passingPoints / totalPoints`, the same line `Submission.isPassing` draws
(`finalScore >= passingPoints`).
- It is recorded on each APPLIED row as `passStandard` and `meetsPassStandard`.
- It is compared with the grade before any late penalty, like the performance itself.
- On both tenants the 5 coding assignments set it explicitly at 60 of 100. The 29 project assignments inherit the
  Assignment model default of 40 of 100; it is not set per project.
- An APPLIED row with no recorded verdict does not qualify.

| # | Evidence on CONDITIONALS_BASICS | Score | Qualifying applied | a0cc9f2c | Now | Conditions units (from scratch) a0cc9f2c → now |
|---|---|---|---|---|---|---|
| 1 | understanding only, 18 right | 100 HIGH | — | STANDARD | STANDARD | DEBUGGING → DEBUGGING |
| 2 | understanding only, 12 of 18 | 67 HIGH | — | STANDARD | STANDARD | DEBUGGING → DEBUGGING |
| 3 | 18 right + applied 20% | 92 HIGH | NO | VERIFIED | **STANDARD** | DEBUGGING, MINI_PROJECT → DEBUGGING |
| 4 | 18 right + applied 59% | 96 HIGH | NO | VERIFIED | **STANDARD** | DEBUGGING, MINI_PROJECT → DEBUGGING |
| 5 | 18 right + applied 60% (the pass line) | 96 HIGH | YES | VERIFIED | VERIFIED | unchanged |
| 6 | 18 right + applied 95% | 99 HIGH | YES | VERIFIED | VERIFIED | unchanged |
| 7 | 18 right + 20%, then a later attempt at 90% | 92 HIGH | YES | VERIFIED | VERIFIED | unchanged |
| 8 | 18 right + 90%, then a later attempt at 20% | 92 HIGH | YES | VERIFIED | VERIFIED | unchanged |
| 9 | diagnostic 8 of 8 + applied 20% | 91 HIGH | NO | VERIFIED | VERIFIED | unchanged |
| 10 | diagnostic 0 of 8 + applied 90% | 10 HIGH | YES | FOUNDATION_REQUIRED | FOUNDATION_REQUIRED | full chain |
| 11 | diagnostic 0 of 8 + five attempts at 90% | 35 HIGH | YES | FOUNDATION_REQUIRED | FOUNDATION_REQUIRED | full chain |
| 12 | reassessment 0 of 8 → 8 of 8 | 50 HIGH | — | GUIDED | GUIDED | full chain |
| 13 | reassessment 8 of 8 → 0 of 8 | 50 HIGH | — | GUIDED | GUIDED | full chain |

**Reattempts.** No behaviour changed:
- A retry is idempotent.
- A regrade replaces its row and its verdict; a regrade across the pass line flips the verdict.
- A new attempt is a new observation.

Failed-then-passed and passed-then-failed give identical Skill DNA: both attempts count, order does not, and the pass
demonstrates the skill. "Latest attempt wins" is not the model, and was not introduced.

**Strong diagnostic + failed applied (case 9).** Normal aggregation applies, with no override:
- Eight right diagnostic items and one 20% practical stay VERIFIED at 91.
- With four items, the same failure drops to REVISION at 84.
- Eight items and two failed practicals give 84 REVISION.

A strong learner is never made to do an assignment first, and repeated failure pulls them down through the normal arithmetic.

**Journeys.** Learner M answers every checkpoint right but fails every practical. Under a0cc9f2c they are VERIFIED on
conditions (87) and functions (85); now they are STANDARD on both. No coding assignment is removed either way. Every
other learner's ninety days are identical under both rules. Strong learners are unchanged, and the backbone is never
missing.

### STANDARD practical treatment — no composer or content change

What a learner measured STANDARD on the topic (7 of 10 diagnostic, beginner elsewhere) is given:

| Topic | Treatment | Practical application | Sufficient |
|---|---|---|---|
| Variables | T_VARIABLES_COMPUTE_PRACTICE (coding assignment, pass 60; 2 coding exercises) | writes programs | YES |
| Conditions | T_CONDITIONS_DEBUGGING: worked example, 4 theory questions, 1 coding exercise (diagnose and repair an if/elif grading chain with the smallest fix) | edits and runs conditional code (ordering, boundaries) | YES |
| Loops | T_LOOPS_INFINITE_LOOPS (coding exercise: make a loop terminate and total correctly), then T_LOOPS_PRACTICE (coding assignment) | writes and repairs loops | YES |
| Functions | T_FUNCTIONS_CALL_RETURN_PRACTICE (coding assignment; 2 coding exercises) | writes functions | YES |
| Arrays | T_ARRAYS_DEBUGGING: 1 coding exercise (diagnose and fix three index faults) | edits traversal code | YES |

The Conditions and Arrays debugging units are genuine application, not recall labelled DEBUG. They carry no graded
assignment, so they produce no APPLIED evidence. A learner capped at STANDARD therefore stays capped until graded work
passes. That follows from the rule; it is not a content gap.

### Diagnostic anchor — material, deferred

Later observations needed before each state is first reached (current model, no recency):

| Case | Start | First reached |
|---|---|---|
| A1 diagnostic 0 of 8, then checkpoints all right | 0 FOUNDATION_REQUIRED | GUIDED 11, STANDARD 24, REVISION 47 |
| A2 diagnostic 0 of 8, then coursework all right (a practical every third observation) | 0 FOUNDATION_REQUIRED | GUIDED 9, STANDARD 18, REVISION 36, VERIFIED 66 |
| B1 diagnostic 8 of 8, then checkpoints all wrong | 100 VERIFIED | REVISION 3, STANDARD 6, GUIDED 11, FOUNDATION_REQUIRED 25 |
| B2 diagnostic 8 of 8, then coursework all failed | 100 VERIFIED | REVISION 3, STANDARD 6, GUIDED 10, FOUNDATION_REQUIRED 25 |
| C diagnostic 4 of 8, then improving coursework | 50 GUIDED | STANDARD 3, REVISION 12, VERIFIED 27 |
| D diagnostic 4 of 8, then declining coursework | 50 GUIDED | FOUNDATION_REQUIRED 4 |
| E diagnostic 0 of 8, then reassessments of 8 of 8 | 0 FOUNDATION_REQUIRED | GUIDED after 1 sitting, STANDARD 2, REVISION 3, VERIFIED 6 |
| F diagnostic 8 of 8, then reassessments of 0 of 8 | 100 VERIFIED | GUIDED after 1 sitting, FOUNDATION_REQUIRED 2 |

**Material: yes.** When the prior is a diagnostic, Skill DNA cannot reflect substantial new evidence within the journey:
- A beginner who then does all Programming Fundamentals coursework perfectly reaches 64 STANDARD at most.
- One perfect reassessment after a failed Skill Check gives 50 GUIDED.

**Recommendation: change later, not blocking.** The error is conservative: it means more teaching, never false
compression, and the backbone guarantees fundamentals regardless. The smallest future change would be for a reassessment
to supersede the earlier sitting of the same assessment, rather than adding time decay. No recency decay is implemented.

### Question supply — no material gap

The test assumes every checkpoint answered right and every graded practical passed.

| Skill | Checkpoint questions | Graded practicals | From unmeasured | From a Skill Check of 0 |
|---|---|---|---|---|
| PROGRAMMING_FUNDAMENTALS | 9 | 2 | VERIFIED | 64 STANDARD |
| SHELL_COMMANDS | 14 | 1 | VERIFIED | 68 STANDARD |
| DSA_ARRAYS | 16 (after mapping) | 2 | VERIFIED | — |
| SQL_BASICS | 16 (after mapping) | 2 | VERIFIED | — |

The STANDARD ceiling from a Skill Check of 0 comes from the diagnostic anchor, not from supply.

### The 76 unmapped checkpoint questions

`src/tests/fixtures/evidence/unmapped-checkpoint-audit.json` lists each question with its class and the reason. All 76
were on units declaring two skills, which the seed leaves unmapped unless the author names one. A question may only map to
a skill its unit declares.

| Class | Count | Detail |
|---|---|---|
| A — should produce no evidence | 1 | "JavaScript and Java are related how?" |
| B — clearly one declared skill | 50 | **Applied** (0ff99b26): DSA_ARRAYS 8, DSA_STRINGS 4, PROPOSITIONAL_LOGIC 2, GIT_FUNDAMENTALS 8, GIT_BRANCHING 2, JS_DOM 9, SQL_BASICS 12, DB_FUNDAMENTALS 5 |
| C — several declared skills | 2 | Git workflow order; UPDATE inside a transaction |
| D — ambiguous | 23 | The natural skill is not declared on the unit (searching, complexity, hashing, JS async, joins, debugging practice), or either declared skill is defensible |

Each B mapping names a skill whose taxonomy description covers the question's subject.
- **Provisioned on both tenants:** 795 checkpoint questions are now mapped (was 745). On the certified units, 786 of 812 are mapped and 26 remain unmapped.
- **Measured before applying:** every learner kept ninety distinct days, all coding assignments and the backbone, and strong learners were unchanged. Git, SQL and database fundamentals become measurable for beginners.

### Mock interview — reclassified UNDERSTANDING

**How interviews produce evidence.**
- A role-mode mock interview writes one row per skill area in the member's role blueprint.
- Each row is scored 0–100 by a model reading the transcript, at weight 0.6.
- The item identity is the area, so repeated interviews rarely reach HIGH confidence.

**The defect.** As DIAGNOSTIC, five interviews at 85%+ on one skill made it VERIFIED (MEDIUM), with no controlled
measurement and no working code behind it. That is the defect the understanding cap exists for, and it also meant a model
deciding mastery.

**The change.** As UNDERSTANDING:
- The weight and score contribution are unchanged.
- A skill resting on interviews alone stops at STANDARD.
- Beside a diagnostic or passed work, interview evidence counts as before.

No interview evidence exists in either provisioned tenant.

**No trigger issue.** Interview rows cannot lift a state past STANDARD on their own, and the next checkpoint recomposes.

### Project timing

A project grade arrives when a grader reviews it, and it recomposes only the future: recomposition freezes every
completed day and today. The evidence gate replays two learners with every project graded ten days after the work:
learner D, whose late grades pass, and learner M, whose late grades fail. In both runs:
- no day already worked changes;
- the journey stays at ninety distinct days;
- the backbone is never missing;
- no coding assignment is removed.

### Testing procedure

The default `npm test` runs every suite in parallel on half the cores. On an 8-core, 8 GB machine, the fourteen
`*.int.test.ts` suites time out starting in-memory MongoDB, and a worker can run out of memory.

The release procedure is `npm run test:release`:
1. Unit suites run on three workers with a per-worker memory ceiling.
2. The integration suites then run in band.
