# CareerPilot Foundation — setting up a tenant on another machine

Git carries code only. The curriculum, the question bank, publication and the engine switch live in
each machine's MongoDB, so every machine (and every tenant) is set up once with the steps below.

Every step that writes has a check-only form. Run that first; it explains any refusal before it
writes anything. All commands run from `server/`, against the database in `server/.env`
(`MONGODB_URI`). PowerShell syntax is shown; in Git Bash use `VAR=value command`.

## 0. Back up the database

This database may hold real students.

```powershell
mongodump --uri "mongodb://localhost:27017/lms-saas" --out "D:\backups\lms-saas-before-foundation"
```

## 1. Get the code

```powershell
git fetch origin
git checkout new_cp_concept
git pull
npm install            # in the repo root, server/ and client/ — as this machine normally installs
```

Restart the server and the client afterwards. The server does not reload by itself.

## 2. Find the tenant

```powershell
cd server
npx ts-node src/scripts/listCareerPilotTenants.ts
```

Copy the `tenant id` of the tenant you are setting up. Below it is written `<TENANT>`.

## 3. Load the curriculum and the question bank

Each command is idempotent — running it twice updates rather than duplicates. Run each without
`--apply` first if you want to see what it will do.

```powershell
npx ts-node src/scripts/seedCareerSkills.ts --apply
npx ts-node src/scripts/importGoldenBank.ts <TENANT>
npx ts-node src/scripts/importGoldenBank.ts <TENANT> --apply
npx ts-node src/seeds/careerPilot/createFoundationCurriculum.ts <TENANT> --apply
npx ts-node src/scripts/validateMegaCurriculum.ts <TENANT>
npx ts-node src/seeds/careerPilot/seedYear1MegaCurriculum.ts <TENANT> --apply
npx ts-node src/seeds/careerPilot/seedYear1Expansion.ts <TENANT> --apply
npx ts-node src/seeds/careerPilot/seedFoundationContent.ts <TENANT> --apply
npx ts-node src/seeds/careerPilot/seedUnitSuitabilityOverrides.ts <TENANT> --apply
npx ts-node src/seeds/careerPilot/seedPilotUnitContent.ts <TENANT> --apply
```

Check:

```powershell
npx ts-node src/scripts/reportUnitReadiness.ts <TENANT>        # expect 355 units, READY 341
npx ts-node src/scripts/auditContentQuality.ts <TENANT>        # expect BLOCKER 0
```

## 4. Publish the certified 338 units

Publishing goes through the real admin route, so it needs a CareerPilot admin **of this tenant**.

```powershell
$env:PUBLISH_ADMIN_EMAIL="<admin email>"; $env:PUBLISH_ADMIN_PASSWORD="<admin password>"
npx ts-node src/scripts/publishCertifiedPublishSet.ts <TENANT>            # check only
npx ts-node src/scripts/publishCertifiedPublishSet.ts <TENANT> --apply    # expect PUBLICATION COMPLETE
npx ts-node src/scripts/certifyProductionComposer.ts <TENANT>             # expect ACTUAL PRODUCTION GATE: PASS
```

## 5. Switch the Foundation stage to the unit engine

In the browser, signed in as that admin, open **`/admin/passport/config`**. In the **Curriculum
engine** card tick **"Plan the Foundation stage with Learning Units"** only (leave "Every stage…" and
the pilot-students box empty), then **Save**. The badges should read Foundation: UNIT and every other
stage TOPIC.

Check: `npx ts-node src/scripts/listCareerPilotTenants.ts` shows `unit engine FOUNDATION_UNIT`.

## 6. Run the acceptance test

Creates its own test students, drives the real routes, and removes everything it created. Real
students are never touched.

```powershell
npx ts-node src/scripts/phase27ActivationE2E.ts <TENANT>                  # expect PHASE 27 E2E: PASS
```

If a run is interrupted: `npx ts-node src/scripts/phase27ActivationE2E.ts <TENANT> --cleanup-only`.

## 7. Give existing students their journey

Students assessed before step 5 have Skill DNA but no journey yet.

```powershell
npx ts-node src/scripts/backfillFoundationJourneys.ts <TENANT>            # dry run: who would get one
npx ts-node src/scripts/backfillFoundationJourneys.ts <TENANT> --apply
```

## 8. Test in the browser

- **New student:** join as a 1st-year (`/careerpilot/join?tenant=<slug>`), finish setup, take the
  skill check. **My Roadmap** and **My 90 Days** show *Foundation Journey — Day 1 of 90*.
- **Start today's work** opens the day: lessons, the checkpoint quiz, the project. Finishing the
  checkpoint updates the future days of the plan.
- **Existing student** (after step 7): the same 90-day journey.
- **A student in a later year** still sees the topic roadmap — only Foundation is on the unit engine.
- **Admin:** the Config screen shows Foundation on the unit engine.
