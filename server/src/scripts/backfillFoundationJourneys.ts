/**
 * Build the ninety-day Foundation journey for members who were assessed before the unit engine was
 * switched on. See foundationJourneyBackfillService for what is decided and why.
 *
 * DRY RUN BY DEFAULT. Nothing is written without --apply.
 *
 *   npx ts-node src/scripts/backfillFoundationJourneys.ts <tenantId>
 *   npx ts-node src/scripts/backfillFoundationJourneys.ts <tenantId> --apply
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { backfillFoundationJourneys, BackfillDecision } from '../services/foundationJourneyBackfillService';

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId)) {
    console.error('Usage: backfillFoundationJourneys.ts <tenantId> [--apply]');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  console.log(`\nFOUNDATION JOURNEY BACKFILL  ·  tenant ${tenantId}  ·  ${apply ? 'APPLY' : 'DRY RUN — nothing is written'}\n`);
  const result = await backfillFoundationJourneys({ tenantId, apply });

  for (const r of result.rows) {
    const outcome = r.action ? `  → ${r.action}${r.reason ? ` (${r.reason})` : ''}` : '';
    console.log(`  ${r.decision.padEnd(13)} ${r.email.padEnd(40)} stage ${String(r.stage || '-').padEnd(11)} measured ${String(r.measuredSkills).padStart(3)}${outcome}`);
  }

  const count = (d: BackfillDecision) => result.rows.filter(r => r.decision === d).length;
  console.log(`\n  students ${result.rows.length}  ·  would create ${count('WOULD_CREATE')}  ·  already have one ${count('HAS_JOURNEY')}`
    + `  ·  nothing measured yet ${count('NOT_READY')}  ·  not members ${count('NOT_MEMBER')}  ·  on the topic engine ${count('TOPIC_ENGINE')}`);
  if (apply) console.log(`  created ${result.created}  ·  not created ${result.notCreated}`);
  else if (count('WOULD_CREATE')) console.log('\n  Dry run. Re-run with --apply to create them.');

  await mongoose.disconnect();
  process.exit(apply && result.notCreated ? 1 : 0);
})().catch(async e => { console.error(e); try { await mongoose.disconnect(); } catch { /* closing */ } process.exit(1); });
