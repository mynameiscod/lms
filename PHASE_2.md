# CareerPilot — Phase 2 backlog

Non-blocking findings from the V1 golden-path closure. Everything here was deliberately
**not** done: none of it prevents a BACKEND_ENGINEER student completing the pilot journey.

---

## Assessment engine

**Skill ranking ignores blueprint importance.**
`rankSkills` orders by prerequisite-first, then skill difficulty, then **alphabetically**.
Blueprint `weight` and `importance` play no part. For BACKEND_ENGINEER this means
`PROGRAMMING_FUNDAMENTALS` (ESSENTIAL, weight 10) is never asked at FOUNDATION or BUILD,
while `COMMUNICATION` (SUPPORTING, weight 4) always is — purely because "C" sorts before
"P". The engine is self-consistent and the papers are valid; they are simply not weighted
the way the blueprint says the role is. Changing this reshapes every paper, so it belongs
in a phase with its own verification.

**HARD coverage is thin above BUILD.**
`PLACEMENT_V1` and `JOB_SEEKER_V1` want 30–35% HARD. The bank holds 136 hard items in
total. Those stages are unconfigured for any role and were explicitly out of scope.

**Difficulty cannot be corrected at mapping time.**
`SkillEvidence` has no difficulty field — the band comes from the source item. An item
graded EASY can only ever fill an EASY slot, however it is mapped.

---

## Content and roles

**Only BACKEND_ENGINEER is pilot-ready.** The other six blueprints install as drafts and
stay unpublished. Each needs the same treatment: check which skills its early stages
actually select, then supply evidence for those.

**No Data or AI roles exist.** `careerGoal` still offers "Data Analytics" and "AI-Ready"
(seeded pathways and question banks route on them), but there is no Data Analyst, Data
Engineer or AI/ML Engineer `CareerRole`, and therefore no blueprint or readiness. A student
choosing those goals gets pathway content but no role destination.

**Career Goal → Domain → Role is not rationalised.** One domain exists
(`SOFTWARE_ENGINEERING`) and `normalizeDomain` always falls back to it, so `career.domain`
can never be missing. Goals, domains and roles are three vocabularies that do not line up.
This is a product decision, not a bug.

**The existing bank does not fit role-based skills.** It was written for a Java/frontend
LMS syllabus: 965 Java items map to `JAVA_*` skills **no blueprint references**, and the
144 "array" items are JavaScript `map`/`filter` API questions. Retagging the existing bank
against the canonical taxonomy would unlock a lot of content — but it is a content project,
not a code change.

---

## Admin tooling

**Evidence mapping is one item at a time.** `PUT /skill-evidence/:sourceType/:sourceId`
with no bulk or import path. Fine for the ~66 pilot mappings, painful for retagging
thousands.

**No config-health screen for "is this role runnable".** The pieces exist — blueprint
summaries, evidence coverage, the new assessment preflight — but an admin must visit three
screens and infer the answer.

**Assessment preview is per-role, per-stage and manual.** A "check every published role"
sweep would catch a broken configuration before a student does.

---

## Onboarding and product

**`career.primaryRole` can never appear in `status.missing`.** An unchosen role reads as
`NOT_SURE`, which is truthy, so completeness never demands it. The setup screen insists on
a choice; the server would accept completion without one.

**Repeat attempts thin out around attempt three.** The pilot pack gives every selected
skill 4–7 items against 2–3 slots. Attempts one and two are proven; a third would start
reusing or falling back. Add ~2 items per skill before reassessment matters.

**`daysPerWeek` was invisible until the roadmap refused.** Career-context completeness does
not require it, but the roadmap planner does — so a student could finish onboarding, sit the
assessment and only then be told to say how much time they have. Fixed for V1 by collecting
it on the Commitment step. The underlying mismatch — two different definitions of "complete"
— is still there and will bite again if another module adds a required input.

---

## Operational (from earlier sessions, unrelated to CareerPilot)

**MongoDB is published on `0.0.0.0:27017`** on the VPS while every other datastore is
loopback-bound. It has credentials, but the box has been mined twice. Close it via
`DOCKER-USER`, not `ufw`.
