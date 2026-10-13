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

Later steps add their scripts to this table.

## Release checklist

1. Back up the production database, and check the backup by restoring it somewhere and counting documents.
2. Deploy the code (V2 stays OFF).
3. Run every script above in order, dry run first, then `--apply` — or use the admin buttons where listed.
4. Open **CareerPilot Roadmap V2** on production: every year's card must say **Must topics fit**.
   Review and adjust priorities there.
5. Pilot: add 3–5 named student IDs (one per year) and watch their roadmaps for 1–2 weeks.
6. Widen by year, then switch it on for everyone.

**Rollback:** switch V2 OFF (instant), then run the scripts with `--rollback` in reverse order.
