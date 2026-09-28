# Moving CareerPilot to production

**The short version: do not copy the development database. Re-run the generators.**

Every curriculum, unit, content bundle and assessment question in CareerPilot is generated from
files in this repository — the stage maps, the unit datasets, the content bundles, and the
golden-bank master CSVs under `docs/audit`. Production does not need a copy of a database; it
needs the same generators run against it.

Copying the dev database instead would carry everything that is *not* curriculum: test members
and their journeys, dev payment rows, dev Razorpay settings, and two tenants' worth of
half-finished experiments. Those are exactly the things production must not have.

---

## 1. Before you run anything

| | |
|---|---|
| **The tenant must already exist** | The provisioning script writes *into* a tenant. Create it the usual way and note its id. |
| **Point at the right database** | The script prints the database host and tenant id and waits for `--apply`. Read that line. It is the mistake that costs most. |
| **The golden-bank CSVs must be current** | They are committed build artefacts. If the banks changed, re-emit first (step 0 below). |
| **Branch** | Provision from the branch you intend to run in production. |

### Step 0 — refresh the bank artefacts (only if the bank sources changed)

```bash
cd server
npx ts-node src/scripts/emitYear2GoldenBank.ts --check   # non-zero if stale
npx ts-node src/scripts/emitYear3GoldenBank.ts --check
```

Drop `--check` to rewrite them, then commit the CSVs.

---

## 2. Provision

Dry run first — it writes nothing and tells you what each step would do (on a NEW tenant it stops at the
first step that needs an earlier step's writes — e.g. "No 'foundation' curriculum" — which is
expected: a dry run cannot read data it did not write):

```bash
cd server
npx ts-node src/scripts/provisionCareerPilot.ts <tenantId>
```

Then:

```bash
npx ts-node src/scripts/provisionCareerPilot.ts <tenantId> --apply
```

It runs 25 steps in dependency order and **halts on the first failure**, because a later step
reading a half-written earlier one is how a tenant ends up subtly wrong rather than obviously
broken. To continue after fixing something:

```bash
npx ts-node src/scripts/provisionCareerPilot.ts <tenantId> --apply --from 15
npx ts-node src/scripts/provisionCareerPilot.ts <tenantId> --apply --only 19,20,21
```

### What it does, and why in that order

| Steps | What | Why here |
|---|---|---|
| 1 | Career skill taxonomy (global, not per tenant) | A curriculum naming an unknown skill is refused |
| 2 | Year 1's curriculum document (topics, skills, backbone) | Years 2–4 create theirs in their seeders; Year 1's seeder only adds units to an existing one |
| 3–7 | Validate Year 1, then the four curricula and their units | Units land DRAFT — invisible to every planning path |
| 8 | Reconcile unit depth and directions | Both are written on insert only, so a tenant seeded earlier keeps wrong values |
| 9–12 | Stage skill sets, enabled | What each stage measures |
| 13–14 | Role blueprints, seeded **and published** | Without these, naming a target role refuses the assessment and then the roadmap |
| 15–18 | Unit content — notes, practice, checkpoints, assignments | Binds to unit codes that must already exist |
| 19–21 | Golden banks | The entry assessment's questions |
| 22–25 | Publish each stage | A unit is only publishable once it has something to teach |

---

## 3. What the script cannot do — do these by hand

### Razorpay keys

**Do not copy the development keys.** Production needs its own, from
Razorpay → Settings → API Keys. Set them in the admin UI under **Integrations**:

- `RAZORPAY_KEY_ID` — `rzp_live_…` (or `rzp_test_…` while testing)
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

These are per-tenant settings, so they live in the database rather than `.env`.

> **Known wrinkle:** `healthService` checks `process.env.RAZORPAY_KEY_ID` while `razorpayService`
> reads tenant settings. If you set the keys in the admin UI, health will report payments as
> unconfigured even though checkout works. The checkout path is the one that matters.

### Preview videos

`seedPreviewVideos.ts` is separate and deliberate. The Savas preview videos are intentional —
replace them through the Admin screen; never bulk-delete them.

### Tenant setup

Admin users, branding, programme length per stage and pricing are tenant configuration, not
curriculum, and are not touched here.

---

## 4. Verify

The provisioning script runs this automatically at the end, or on its own:

```bash
npx ts-node src/scripts/provisionCareerPilot.ts <tenantId> --verify-only
```

Expected on a fully provisioned tenant — measured 2026-09-28 by provisioning an EMPTY database
from the repo (these are what the generators produce; a tenant that has been hand-edited will differ):

```
  foundation    345/350  units published    43 topics (11 backbone)
  build         377/377  units published    33 topics (20 backbone)
  specialize    453/453  units published   100 topics (75 backbone)
  placement     439/439  units published    96 topics (50 backbone)

  assessment items       6150 (6150 skill-keyed)
  role blueprints        7 (7 published)
```

The AI, Data, Security and Cloud roles (step 14) are skipped on a new tenant: those twelve roles
are not system roles, so create them in the admin screen first if you want their blueprints, then
re-run with `--only 14`.

It warns loudly if a stage has no published units, if no blueprint is published, or if there are
no skill-keyed assessment items — the three faults that produce a member who can pay and then
cannot be assessed or given a roadmap.

### Then prove it end to end

```bash
npx ts-node src/scripts/verifyStageJourneys.ts <tenantId> build 110
npx ts-node src/scripts/verifyStageJourneys.ts <tenantId> specialize 130
npx ts-node src/scripts/verifyStageJourneys.ts <tenantId> placement 150
```

This persists a real journey for eleven learner profiles per stage, reads back what landed in
the days, and deletes them again. Composition is not delivery — Year 4 once composed the capstone
and the packer trimmed it silently, and that was invisible until a journey was actually written.

---

## 5. Re-running on a tenant that already has students

Every step is idempotent, and the seeders never unpublish a unit somebody published or undo an
authorship decision an admin made. That is what makes re-running safe when content changes.

It is not invisible, though. **Step 8 changes unit depth and direction scoping**, and both are
inputs to composition — so a student whose journey is recomposed *after* this runs may get a
different plan from the one they would have got before. Nothing already written to a student's
days is touched. The script counts existing journeys and says so before it starts.

---

## 6. If you genuinely need to move data rather than regenerate it

The only things that are not reproducible from the repo are the ones you should think hardest
about copying: members, their Skill DNA, their journeys and their payments. If you are migrating
a live cohort rather than standing up a fresh tenant, that is a database migration
(`mongodump` / `mongorestore` on those collections specifically) and a different exercise from
this one — and it should never include `settings`, `payments` or any tenant other than the one
being moved.
