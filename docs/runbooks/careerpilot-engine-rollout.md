# Fixing CareerPilot in production — the one command

**Symptom:** a second-, third- or final-year is shown "Your Learning Roadmap · Foundation →
Build → Placement · Day 1 / 90" — the old pathway roadmap — while the sidebar beside it
correctly says "My 110 Days". Only Year 1 works.

---

## The command

```bash
# 1. See what it would do. Writes nothing.
docker exec <container> node dist/scripts/provisionCareerPilot.js <tenantId>

# 2. Do it.
docker exec <container> node dist/scripts/provisionCareerPilot.js <tenantId> --apply
```

That is the whole fix. It runs all 25 provisioning steps, then configures the stages, then
verifies. Dry run by default.

**Read the last block of the output.** It is the only one that answers the question you ran it
for:

```
  what a student on each stage is served:
    foundation  UNIT   their curriculum       (FOUNDATION_PRODUCT)
    build       UNIT   their curriculum       (STAGE_LIST)
    specialize  UNIT   their curriculum       (STAGE_LIST)
    placement   UNIT   their curriculum       (STAGE_LIST)
```

Any line saying `TOPIC  the OLD topic roadmap` is a year still broken, and the warnings above it
say why.

---

## Why the previous version could not work

It ran its steps as `npx ts-node src/scripts/…ts`. The production image (see the Dockerfile)
makes that impossible three times over:

| Dockerfile line | Consequence |
|---|---|
| `COPY --from=backend-build /app/dist ./dist` | there is no `src/` — every step path is wrong |
| `RUN npm prune --omit=dev` | `ts-node` and `typescript` are devDependencies and are **deleted** |
| `docs/` was never copied | the golden-bank CSVs the question banks are generated from are absent |

So it failed at step 1 and at every step after it. It worked perfectly in development, which is
how it survived long enough to be trusted.

**Fixed:** the script now detects from its own filename whether it is compiled, and runs its
steps as `node dist/…js` or `npx ts-node src/…ts` to match. Nothing to pass. The Dockerfile now
carries `COPY docs/audit ./docs/audit`, so **the image must be rebuilt and redeployed once**
before the question-bank steps (19–21) can run inside the container.

If you have not redeployed yet, those three steps skip themselves with the path they wanted and
the two ways out — the rest still runs.

---

## What it now does that it did not before

**It turns the years on.** Seeding content never did this, and nothing else did either.
`foundation` is on the unit engine unconditionally; every other stage opts in through three
`PassportConfig` fields that **no admin screen renders**. A tenant could hold all four years,
published, with banks — and still serve Years 2–4 the old roadmap, because the last step was a
config write nobody knew was owed. That is what happened in production.

It enables only stages that pass readiness, and names any it leaves off. Enabling a stage with no
content moves its students from a wrong roadmap to no roadmap.

It never sets `megaCurriculumEnabled` — that moves every stage at once, including any added
later.

**It fills in programme length** from the shipped defaults (90 / 110 / 130 / 150).

**It never invents a price.** A stage with no entry in `priceInrByStage` falls back to the
tenant's single `priceInr`, and the script says so loudly:

```
  ⚠ specialize has no price of its own and will sell at priceInr = 499
```

Set those in the admin Config screen. A Year-2 student offered "Unlock CareerPilot — ₹1" is this.

---

## If you only need the switch

Content already in production and only the opt-in missing:

```bash
docker exec <container> node dist/scripts/diagnoseCareerPilotEngine.js <tenantId>     # read-only
docker exec <container> node dist/scripts/setCurriculumEngineStages.js <tenantId> \
  --stages build,specialize,placement --apply
```

`setCurriculumEngineStages` refuses a stage whose content is short, by name. Additive —
a later run for Year 3 cannot take Year 2 back off. `--remove` is the rollback.

Pilot one account per year first if you prefer:

```bash
docker exec <container> node dist/scripts/setCurriculumEngineStages.js <tenantId> \
  --students <id1>,<id2>,<id3> --apply
```

---

## Existing journeys

Nothing here rewrites a journey that already exists. A student already carrying a topic roadmap
keeps it until a trigger recomposes them (`DIAGNOSTIC_COMPLETED`, `MODULE_ASSESSMENT_COMPLETED`,
`PROJECT_EVALUATED`, `SIGNIFICANT_MASTERY_CHANGE`, `DIRECTION_CHANGED`). A student with no
journey gets a unit one at their next trigger.

Do not bulk-delete journeys of students who have started.

## Rollback

```bash
docker exec <container> node dist/scripts/setCurriculumEngineStages.js <tenantId> \
  --stages build,specialize,placement --remove --apply
```

Students return to the topic roadmap. Unit journeys already written are left in place and picked
up again if the stage is switched back on.
