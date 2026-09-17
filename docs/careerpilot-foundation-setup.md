# CareerPilot Foundation — setting up a tenant

**Every Foundation (first-year) CareerPilot learner is planned by the unit engine and receives exactly
90 days.** That is product policy in code: there is no switch to turn on, and no tenant or database
falls back to the old topic roadmap.

What a tenant does need is its **Foundation curriculum**. Git carries code only; the curriculum,
question bank and publication live in each database, and every Year-1 record except the skill
taxonomy belongs to one tenant (its ids are derived from the tenant's id — never copy them between
tenants). A tenant without it is **NOT CONFIGURED**: its Foundation learners are told so plainly, and
are never shown a shorter plan.

One command provisions a tenant. It is deterministic, idempotent, retry-safe, and records every run.

## 0. Back up the database

```powershell
mongodump --uri "mongodb://localhost:27017/lms-saas" --out "D:\backups\lms-saas-before-foundation"
```

## 1. Get the code and restart

```powershell
git fetch origin; git checkout new_cp_concept; git pull
npm install            # repo root, server/ and client/, as this machine normally installs
```

Restart the server and the client. The server does not reload by itself.

## 2. Find the tenant

```powershell
cd server
npx ts-node src/scripts/listCareerPilotTenants.ts
```

Each tenant shows its `tenant id`, whether the **Foundation product** is `CONFIGURED`, and its last
provisioning run. The tenant needs a TENANT_ADMIN user (seeded project briefs are attributed to one).

## 3. Provision

```powershell
npx ts-node src/scripts/provisionCareerPilotFoundation.ts <TENANT>            # plan only — shows the state and the steps
npx ts-node src/scripts/provisionCareerPilotFoundation.ts <TENANT> --apply    # expect: FOUNDATION PROVISIONING: COMPLETE
```

From a compiled build: `node dist/scripts/provisionCareerPilotFoundation.js <TENANT> --apply`.

It runs, in order, stopping at the first failure:

1. the skill taxonomy (global); the **Foundation stage skill set** — what a first-year is measured
   on, written switched on, because without it a student who answered "I'm not sure yet" is asked to
   choose a target role before anything will open; the Foundation question bank; the curriculum
   hierarchy and its validation gate
2. the Year-1 Learning Units, expansion units, content, suitability overrides, and unit content —
   checkpoint quizzes with every question linked to its quiz, project assignments, and a runnable
   Python coding assignment on the first practice day of Variables, Conditions, Loops, Functions and Arrays
3. publication of **exactly the certified 346 units**, through the product's publish handler and its
   gates, refused if the tenant's READY inventory is not identical to the certified one
4. verification: 359 units, 354 READY, PRODUCTION = the certified 346, quiz linkage, the stage skill
   set present and enabled, Foundation CONFIGURED
5. the production gate (`certifyProductionComposer`) — 9/9, 40/40, 72/72

Running it again changes nothing: seeds update in place on deterministic keys, published units are
skipped. A failed run is resumed by running it again. Each run is recorded in
`careerpilotprovisioningruns`.

## 4. Give existing Foundation students their journey

Students who took their skill check before the tenant was provisioned have Skill DNA but no journey.

```powershell
npx ts-node src/scripts/backfillFoundationJourneys.ts <TENANT>            # dry run: who would get one
npx ts-node src/scripts/backfillFoundationJourneys.ts <TENANT> --apply
```

New students get theirs automatically when they complete the skill check.

## 5. Acceptance

```powershell
$env:PUBLISH_ADMIN_EMAIL="<tenant admin email>"; $env:PUBLISH_ADMIN_PASSWORD="<password>"
npx ts-node src/scripts/phase27ActivationE2E.ts <TENANT> --activate        # expect: PHASE 27 E2E: PASS
```

Creates its own test students, drives the real routes, removes everything it created; real students
are never touched. Interrupted: `... phase27ActivationE2E.ts <TENANT> --cleanup-only`.

## 6. In the browser

- **New first-year, before membership:** join (`/careerpilot/join?tenant=<slug>`), finish setup,
  take the skill check. **My Roadmap** shows only the first days of *their own* plan (the admin's
  *Roadmap preview (days)* setting, default 7) and *🔒 Unlock to see your full 90-day roadmap*.
  Nothing beyond the preview opens. A student who answered **"not sure"** about their target role is
  measured against the Foundation stage skill set, so **Readiness** shows their foundation path — it
  must never ask them to choose a role first.
- **After membership** (payment, or an admin conversion/grant): the full 90-day roadmap is generated
  automatically from the same skill check. **My Roadmap**, **My 90 Days** and **Home** show
  *Foundation Journey — Day 1 of 90*; **Start today's work** opens the day's lessons, checkpoint and project.
- **Admin — preview length:** CareerPilot Config → *Roadmap preview (days)*, 1–30.
- **Existing first-year** (after step 4): the same 90-day journey.
- **Later-year student:** still the topic roadmap — only Foundation has a Learning Unit curriculum.
- **Admin — Config** (`/admin/passport/config`): *Foundation curriculum: provisioned*, with its unit and
  skill-check counts.
- **Admin — a student's journey:** Members → Roadmap (`/admin/passport/students/<id>/roadmap`).
- **Admin — curriculum** (`/admin/passport/mega-curriculum`): editing, content, checkpoints, projects,
  publishing. Unpublishing a unit that journeys use asks for confirmation; deleting one is refused.
  After a curriculum edit, re-run `certifyProductionComposer.ts <TENANT>`: an edited unit is no longer
  the certified inventory, and provisioning's publication step will refuse until it is re-certified.

## If a tenant says NOT CONFIGURED

Run step 3 for it. Nothing else — no configuration switch, no manual database change — is involved.
