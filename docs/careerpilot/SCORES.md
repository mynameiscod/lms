# How CareerPilot calculates its scores

Every number a member sees, what it is built from and the exact formula. Current rules: SKILL_DNA_V2 and ROLE_READINESS_V2 (2026-10-30).

The scores build on each other:

```
answers, assignments, interviews  →  Skill DNA (one score per skill)
Skill DNA                         →  Role readiness (against the member's role)
Role readiness                    →  Career Score (0–100, stored)
Career Score + practice + journey + interviews + resume  →  Coder Score (0–1000)
Skill DNA grouped by skill area   →  Skill meter (Home radar)
```

---

## 1. Skill score (Skill DNA), per skill

**Where:** Skill DNA page and Home. **Code:** `server/src/data/skillDnaPolicy.ts`, `server/src/services/skillDnaService.ts`.

Every answered item becomes evidence for the skills it tests. An item is a question, a coding assignment or an interview question.

**Each piece of evidence has a performance and a weight:**

- `performance = points earned ÷ points possible`, from 0 to 1. Partial credit counts.
- `weight = relationship × difficulty × source`. The three factors:

| Factor | Values |
|---|---|
| Relationship | Primary skill of the item 1.0 · Secondary 0.25 |
| Difficulty | Easy 0.85 · Medium 1.0 · Hard 1.15 |
| Source | Skill assessment 1.0 · Coding assignment 1.0 · Project 1.0 · Placement check 0.8 · Mock interview 0.6 · Module/quiz 0.5 |

**Latest answer only.** If the same item is answered again (a retake), only the latest answer counts. Different items all count.

**The score:**

```
skill score = 100 × Σ(performance × weight) ÷ Σ(weight)        rounded, 0–100
```

**Confidence** says how much evidence is behind the score, not how good it is:

| Confidence | Rule |
|---|---|
| HIGH | total weight ≥ 7 and at least 3 different items |
| MEDIUM | total weight ≥ 3 and at least 2 different items |
| LOW | anything less |

A skill with no evidence has no score. That means "not measured yet", never 0.

**Average skill score** (Skill DNA page, Home before membership): the plain average of the skills with MEDIUM or HIGH confidence. If no skill has reached MEDIUM yet, it averages every measured skill and is labelled *early*. Retired skills never count.

---

## 2. Role readiness

**Where:** My result, Home, Placement. **Code:** `server/src/data/roleReadinessPolicy.ts`, `server/src/services/roleReadinessService.ts`.

The admin's blueprint for the member's role lists skills. Each has a weight, an importance and a target level.

| Target level | Target score |
|---|---|
| Foundation | 40 |
| Working | 60 |
| Proficient | 75 |
| Advanced | 90 |

Only skills measured with MEDIUM or HIGH confidence count. Retired skills are listed but never count.

```
skill ratio          = min(1, skill score ÷ target score)
readiness            = 100 × Σ(ratio × weight over counted skills) ÷ Σ(weight of counted skills)
coverage             = 100 × Σ(weight of counted skills) ÷ Σ(weight of all skills)
whole-role readiness = 100 × Σ(ratio × weight over counted skills) ÷ Σ(weight of all skills)
```

- **Readiness** answers "how ready are you on what we have measured".
- **Whole-role readiness** treats every unmeasured skill as 0, so it can never be inflated by measuring only a few skills.
- **Early estimate:** below 40% coverage, readiness is shown as an *early estimate*, with the whole-role figure beside it.

**Skill status**, for gaps and the counts:

| Status | Rule |
|---|---|
| Strong | at or above target + 10, with HIGH confidence |
| On track | at or above target |
| Needs work | up to 15 points below target |
| Priority gap | more than 15 points below target |
| Not measured yet | LOW confidence, or no evidence |

**Gap order:** gaps are ranked by `(gap ÷ target) × weight × importance`. This is the same order the roadmap uses.

**Year 1:** members have no role, so role readiness is not shown to them. It opens in Year 2. It is still worked out internally against the Year-1 skill set, so the roadmap can rank Year-1 gaps.

**Confidence of the whole figure:**

| Confidence | Rule |
|---|---|
| HIGH | coverage ≥ 75% and at least 70% of essential skills measured |
| MEDIUM | coverage ≥ 40% |
| LOW | less |

---

## 3. Career Score (0–100) and level

**Code:** `server/src/services/careerScoreService.ts`. The Career Score is the member's role readiness, rounded and stored.

- **Refreshed** every time any skill score changes.
- **Coverage rule:** written only when coverage is at least 40%. Below that it is not written, so too little evidence never becomes a headline score.

| Level | Career Score |
|---|---|
| Career Explorer | 0 |
| Foundation Required | 30 |
| Career Starter | 45 |
| Skill Builder | 60 |
| Internship Ready | 75 |
| Placement Ready | 85 |

---

## 4. Coder Score (0–1000)

**Where:** Home hero and "Where your score comes from". **Code:** `coderScore` in `server/src/services/passportGamificationService.ts`; inputs in `passportDashboardController.ts`.

| Part | Max | Formula |
|---|---|---|
| Career Readiness Assessment | 400 | `Career Score ÷ 100 × 400`. Below 40% coverage, whole-role readiness is used instead. |
| Practice solved | 250 | `min(1, problems solved ÷ 100) × 250` |
| Daily missions | 200 | `days completed on your journey ÷ days in your journey × 200` |
| Mock interviews | 100 | `(min(1, interviews done ÷ 3) × 0.5 + best interview score ÷ 100 × 0.5) × 100` |
| Resume readiness | 50 | `resume score ÷ 100 × 50` |

Each part is rounded, then the parts are added.

| Label | Coder Score |
|---|---|
| Excellent | 750+ |
| On track | 500+ |
| Just getting started | less |

"Ahead of N%" next to the Coder Score compares **XP**, not the Coder Score, and says so on screen.

---

## 5. Skill meter (Home radar)

Skill DNA grouped by skill area (the skill's domain). For each area:

```
area score = Σ(skill score × skill evidence weight) ÷ Σ(skill evidence weight)
```

- **Skills used:** those with MEDIUM or HIGH confidence. An area with only LOW-confidence skills still shows, marked *early*.
- **Which areas:** the six with the most evidence. The radar needs at least three areas to draw.

---

## 6. XP, level and streak

- **Level:** reaching level *n* takes `50 × n × (n − 1)` XP in total (levels 2, 3 and 4 need 100, 300 and 600).
- **Streak:** consecutive days with qualifying activity.
- **Day boundary:** days are counted in **India time (UTC+5:30)**. Activity after midnight counts for the new day.

---

## Bringing stored scores up to date

Scores are stored, not computed when a page opens. After a rule change, run this once per environment:

```
node dist/scripts/recomputeSkillScores.js            # dry run: how many scores would change
node dist/scripts/recomputeSkillScores.js --apply    # recompute every member, refresh Career Scores
```

Running it again finds nothing to change.

## Known limits (not yet changed)

- **Placement readiness, interview part:** it uses only the technical interview dimension and the latest interview. The Home Coder Score uses the best interview.
- **Readiness band labels** (for example 80/60/40 on My result, 80/70/40 on Placement) are set on each screen, not in one server rule. The same readiness can carry a different label on different pages.
- **XP history:** older XP sources do not write to the XP history, so the history may not add up to the XP total.
