# Turning on Years 2, 3 and 4 in production

**Symptom this fixes:** a second-, third- or final-year is shown "Your Learning Roadmap ·
Foundation → Build → Placement · Day 1 / 90" — the old pathway roadmap — while the sidebar
beside it correctly says "My 110 Days". Or `/careerpilot/plan` says "Your ninety days are being
written, 5 of 90" with Year-1 band names for a Year-2 student.

**Cause:** `foundation` is on the UNIT engine unconditionally. Every other stage reaches it only
where the tenant has opted in, via three `PassportConfig` fields that **no admin screen renders**.
A deployment carrying a full four-year curriculum still serves Years 2–4 the topic roadmap until
somebody opts in.

This is working as designed — see the header of `src/data/curriculumEnginePolicy.ts`. The gate
exists so a stage cannot be switched on for paying members before its content is there.

---

## Step 1 — Diagnose. Read-only, safe any time.

```bash
docker exec lms-server-<slot> node dist/scripts/diagnoseCareerPilotEngine.js <tenantId>
```

Writes nothing. Reports, per stage: which engine resolves, published unit counts against the
stage's own programme length, stage template topics and backbone flags, stage skill set size,
journeys already written, role blueprints, and a verdict naming what is in the way.

Read section 6. There are two blockers and they need different fixes:

| Verdict | Meaning | Fix |
|---|---|---|
| `SWITCH OFF` only | content is there, nobody opted in | step 3 |
| `CONTENT SHORT` | the curriculum did not reach production | deploy content first |
| `NO SKILL CHECK` | no PRIMARY skill-evidence mappings | run provisioning |

**Do not skip to step 3 if any stage says CONTENT SHORT.** Switching a short stage on moves its
students from a wrong roadmap to no roadmap at all.

## Step 2 — Check price and programme length while you are there.

Section 1 of the same output prints `priceInr`, `priceInrByStage`, `programDaysByStage` and
`foundationProgramDays`.

`priceInrByStage` unset means every year sells at the base `priceInr`. A Year-2 student offered
"Unlock CareerPilot — ₹1" is this. Fix it before the rollout, not after — the engine switch is
what sends them to the paywall.

## Step 3 — Switch on, narrowly first.

No admin screen sets these fields. Use the script.

**A pilot account per year, before anybody who paid:**

```bash
docker exec lms-server-<slot> node dist/scripts/setCurriculumEngineStages.js <tenantId> \
  --students <id1>,<id2>,<id3>
# then, to write:
docker exec lms-server-<slot> node dist/scripts/setCurriculumEngineStages.js <tenantId> \
  --students <id1>,<id2>,<id3> --apply
```

Dry run by default. Verify each pilot account composes a real roadmap for its year before going
further.

**Then the stages:**

```bash
docker exec lms-server-<slot> node dist/scripts/setCurriculumEngineStages.js <tenantId> \
  --stages build,specialize,placement --apply
```

The script runs the readiness check per stage first and **refuses a stage whose content is
short**, naming it. `--force` overrides that and is only right when a content deploy is already
staged and you know the order you are doing it in.

Both lists are additive — a later run for Year 3 cannot silently take Year 2 back off.
`--remove` takes stages off again, which is the rollback.

## What NOT to do

**Do not set `megaCurriculumEnabled: true`.** It moves every stage at once, including any with
no content and any added later. The stage list records what was decided, one stage at a time,
and reads back as the decision it was. The script deliberately offers no flag for the tenant
switch.

## Step 4 — Existing journeys

Nothing here rewrites a journey that already exists. A student already carrying a topic roadmap
keeps it until a trigger recomposes them; a student with no journey gets a unit one at their next
trigger (`DIAGNOSTIC_COMPLETED`, `MODULE_ASSESSMENT_COMPLETED`, `PROJECT_EVALUATED`,
`SIGNIFICANT_MASTERY_CHANGE`, `DIRECTION_CHANGED`).

Decide deliberately whether to leave them or rebuild the unstarted ones. Do not bulk-delete
journeys of students who have started.

## Rollback

```bash
docker exec lms-server-<slot> node dist/scripts/setCurriculumEngineStages.js <tenantId> \
  --stages build,specialize,placement --remove --apply
```

Students return to the topic roadmap. Unit journeys already written are left in place and are
picked up again if the stage is switched back on.
