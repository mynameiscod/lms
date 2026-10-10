/**
 * RV2 M001 — the first draft of every topic's priority (MUST / SHOULD / OPTIONAL).
 *
 * Writes `priority` and `prioritySource: 'DRAFT'` on the topics of the four stage curricula
 * (foundation, build, specialize, placement), computed by data/topicPriorityPolicy.ts from what
 * the curricula already say. Inert until Roadmap V2 is switched on: V1 never reads these fields.
 * Never overwrites a priority an admin set.
 *
 *   npx ts-node src/migrations/roadmap-v2/M001_topicPriorityDraft.ts <tenantId>              # dry run
 *   npx ts-node src/migrations/roadmap-v2/M001_topicPriorityDraft.ts <tenantId> --apply      # write
 *   npx ts-node src/migrations/roadmap-v2/M001_topicPriorityDraft.ts <tenantId> --rollback   # undo
 *
 * The connection is read from MONGODB_URI. GIT_COMMIT may be set to record which code wrote it.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { computeDraft, applyDraft, restorePrior } from '../../services/topicPriorityService';
import { getApplied, recordApplied, removeApplied } from './_ledger';

dotenv.config();
const MIGRATION = 'RV2_M001_topicPriorityDraft';
const h = (m: number) => `${Math.round(m / 6) / 10}h`;

async function main() {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  const rollback = process.argv.includes('--rollback');
  if (!tenantId || tenantId.startsWith('--')) {
    console.error('Usage: M001_topicPriorityDraft.ts <tenantId> [--apply | --rollback]');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  if (rollback) {
    const entry = await getApplied(MIGRATION, tenantId);
    if (!entry) { console.log('Nothing to roll back: M001 has not been applied for this tenant.'); return; }
    await restorePrior(entry.prior as any);
    await removeApplied(MIGRATION, tenantId);
    console.log(`Rolled back ${(entry.prior as any[]).length} topic(s) to their previous priority.`);
    return;
  }

  if (apply && await getApplied(MIGRATION, tenantId)) {
    console.log('Already applied for this tenant — nothing to do. (Roll back first to re-apply.)');
    return;
  }

  const drafts = await computeDraft(tenantId);
  for (const d of drafts) {
    const b = d.budget;
    console.log(`\n${d.stage.toUpperCase()}  ${d.rows.length} topics | ${b.programDays} days × ${b.dailyMinutes} min = ${h(b.budgetMinutes)} | bridge ${h(b.bridgeMinutes)} | MUST cap ${h(b.mustCapMinutes)}`);
    if (!d.curriculumId) { console.log('  (no published stage curriculum — skipped)'); continue; }
    for (const k of ['MUST', 'SHOULD', 'OPTIONAL'] as const) {
      console.log(`  ${k.padEnd(8)} ${String(d.after[k].topics).padStart(3)} topics  ${h(d.after[k].minutes).padStart(7)}`);
    }
    if (d.demoted.length) console.log(`  moved MUST → SHOULD to fit the cap: ${d.demoted.length} topic(s)`);
    if (d.overCap) console.log('  ⚠ MUST still exceeds the cap (admin-set MUST topics) — review on the admin screen');
  }

  if (!apply) { console.log('\nDry run — nothing written. Re-run with --apply to write the draft.'); return; }
  const { written, prior } = await applyDraft(tenantId, drafts, 'RV2_M001');
  await recordApplied({
    migration: MIGRATION, tenantId, appliedBy: 'RV2_M001', gitCommit: process.env.GIT_COMMIT || 'unknown',
    counts: { written }, prior,
  });
  console.log(`\nApplied: ${written} topic priority(ies) written and recorded in the ledger.`);
}

main()
  .catch(e => { console.error(e); process.exitCode = 1; })
  .finally(() => mongoose.disconnect());
