# Roadmap V2 — database changes and release checklist

**Pushing code does not move data.** Git carries these scripts; it does not run them. Each
database change below must be run against the production database after the code is deployed.
Until it is, Roadmap V2 must stay switched OFF (it is OFF by default).

Production has no `ts-node` and no `src/` — only the compiled `dist/`. Every script here is
compiled with the app, so on production run it with plain `node`:

```
node dist/migrations/roadmap-v2/<script>.js <tenantId>              # dry run: prints what would change
node dist/migrations/roadmap-v2/<script>.js <tenantId> --apply      # writes, and records it in the ledger
node dist/migrations/roadmap-v2/<script>.js <tenantId> --rollback   # undoes exactly what --apply wrote
```

Locally: `npx ts-node src/migrations/roadmap-v2/<script>.ts <tenantId> [--apply|--rollback]`.

The connection comes from `MONGODB_URI`. Set `GIT_COMMIT` to record which code wrote a change.
Every apply is recorded in the `schemamigrations` collection (`_ledger.ts`) with the prior
values its rollback needs; a second `--apply` does nothing.

## Changes, in run order

| # | Script | What it changes | Without a shell |
|---|---|---|---|
| 1 | — | `passportconfigs.roadmapV2` (switch, daily minutes, revision days). Nothing to run: a missing setting reads as OFF with the defaults. | — |
| 2 | `M001_topicPriorityDraft` | Writes `priority` (MUST / SHOULD / OPTIONAL) and `prioritySource: 'DRAFT'` on the topics of the four stage curricula. Never changes a priority an admin set. | Admin → **CareerPilot Roadmap V2** → **Generate draft priorities** does the same, recorded in the same ledger. |

| 3 | `rv2Settings` | `passportconfigs.roadmapV2`: `pilot <ids>` / `on` / `v2only` / `off`. Takes effect at once. | Admin → **CareerPilot Roadmap V2** → **Settings**. |
| 4 | `rv2Rebuild` | Rebuilds old (V1) student roadmaps as V2: not started → whole roadmap; started → completed and open days kept, the rest rebuilt. Dry run without `--apply`; `--stage=<year>` or `--student=<userId>` to narrow it. | Admin → **CareerPilot Roadmap V2** → **Move existing students to V2**, or a student's journey page → **Rebuild roadmap as V2**. |

`rv2Status` is read-only and safe any time: the tenant's name (to confirm the id), the V2
setting, each year's topic priorities, and how many student roadmaps are V1 and V2 per year.

```
node dist/migrations/roadmap-v2/rv2Status.js <tenantId>
node dist/migrations/roadmap-v2/rv2Settings.js <tenantId> pilot <userId1,userId2>
node dist/migrations/roadmap-v2/rv2Rebuild.js <tenantId> --apply --student=<userId>
node dist/migrations/roadmap-v2/rv2Settings.js <tenantId> on
node dist/migrations/roadmap-v2/rv2Rebuild.js <tenantId>              # dry run
node dist/migrations/roadmap-v2/rv2Rebuild.js <tenantId> --apply
node dist/migrations/roadmap-v2/rv2Settings.js <tenantId> v2only
```

A rebuilt roadmap cannot be turned back into its V1 one by a script: to undo rebuilds, restore
the backup taken in step 1 of the checklist.

## Release checklist

1. Back up the production database, and check the backup by restoring it somewhere and counting documents.
2. Deploy the code (V2 stays OFF).
3. Run every script above in order, dry run first, then `--apply` — or use the admin buttons where listed.
4. Open **CareerPilot Roadmap V2** on production: every year's card must say **Must topics fit**.
   Review and adjust priorities there.
5. Pilot: `rv2Settings … pilot <ids>` (3–5 students, one per year), rebuild them
   (`rv2Rebuild … --apply --student=<id>`) and watch their roadmaps for 1–2 weeks.
6. Switch it on for everyone (`rv2Settings … on`), rebuild every old roadmap (`rv2Rebuild`, dry run
   first, then `--apply`), then `rv2Settings … v2only` so V1 is never used again.

**Rollback:** `rv2Settings … off` (instant), then `M001_topicPriorityDraft … --rollback`. Rebuilt roadmaps are undone only by restoring the backup.
