/**
 * Move the XP ledger's uniqueness from (tenantId, idempotencyKey) to
 * (tenantId, studentId, idempotencyKey).
 *
 *   npx ts-node src/scripts/migrateXpLedgerIndex.ts            # dry run — reports, changes nothing
 *   npx ts-node src/scripts/migrateXpLedgerIndex.ts --apply    # performs the migration
 *
 * WHY THIS SCRIPT HAS TO EXIST.
 * Mongoose creates indexes it finds in a schema; it NEVER removes ones it does not. An
 * obsolete unique index therefore survives a deploy silently and keeps enforcing the rule
 * that was just fixed — the application would look correct in code review and still refuse
 * to pay a second student their streak bonus. Nothing about shipping the new schema removes
 * the old constraint on its own.
 *
 * ORDER MATTERS, AND IT IS BUILD-THEN-DROP.
 * The replacement is created first and only then is the old one removed, so there is never a
 * moment where neither is enforcing uniqueness. The reverse order leaves a window in which a
 * retried request could double-award, which is precisely what these indexes exist to stop.
 *
 * SAFE TO RUN REPEATEDLY. It reports what it finds, does only what is missing, and treats an
 * already-migrated database as success rather than as an error.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { XpLedger, XP_LEDGER_UNIQUE_INDEX, XP_LEDGER_OBSOLETE_INDEX } from '../models/GamificationModels';

dotenv.config();

interface Plan {
  hasNew: boolean;
  hasObsolete: boolean;
  /** Rows that would violate the NEW index. Should always be zero — see below. */
  conflicts: { tenantId: string; studentId: string; idempotencyKey: string; n: number }[];
}

export async function inspect(): Promise<Plan> {
  const existing = await XpLedger.collection.indexes();
  const names = existing.map((i: any) => i.name);

  /**
   * The new key is strictly WIDER than the old one, so anything the old index permitted the
   * new one permits too. A duplicate here would mean rows that the old index should already
   * have refused, which would point at a second problem rather than at this migration — so
   * it is checked and reported rather than assumed away.
   */
  const conflicts = await XpLedger.aggregate([
    {
      $group: {
        _id: { tenantId: '$tenantId', studentId: '$studentId', idempotencyKey: '$idempotencyKey' },
        n: { $sum: 1 },
      },
    },
    { $match: { n: { $gt: 1 } } },
    { $limit: 20 },
  ]);

  return {
    hasNew: names.includes(XP_LEDGER_UNIQUE_INDEX),
    hasObsolete: names.includes(XP_LEDGER_OBSOLETE_INDEX),
    conflicts: conflicts.map((c: any) => ({
      tenantId: c._id.tenantId,
      studentId: String(c._id.studentId),
      idempotencyKey: c._id.idempotencyKey,
      n: c.n,
    })),
  };
}

export async function migrate(apply: boolean): Promise<{ created: boolean; dropped: boolean; blocked: boolean }> {
  const plan = await inspect();

  if (plan.conflicts.length) {
    console.error('Rows already violate the student-scoped key. Nothing was changed:');
    for (const c of plan.conflicts) {
      console.error(`  ${c.tenantId} / ${c.studentId} / ${c.idempotencyKey} → ${c.n} rows`);
    }
    console.error('Resolve these before migrating — a unique index cannot be built over them.');
    return { created: false, dropped: false, blocked: true };
  }

  console.log(`replacement index ${XP_LEDGER_UNIQUE_INDEX}: ${plan.hasNew ? 'present' : 'MISSING'}`);
  console.log(`obsolete index    ${XP_LEDGER_OBSOLETE_INDEX}: ${plan.hasObsolete ? 'PRESENT — must be dropped' : 'absent'}`);

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to make these changes.');
    return { created: false, dropped: false, blocked: false };
  }

  let created = false;
  if (!plan.hasNew) {
    // Built first, so uniqueness is never unenforced between the two statements.
    await XpLedger.collection.createIndex(
      { tenantId: 1, studentId: 1, idempotencyKey: 1 },
      { unique: true, name: XP_LEDGER_UNIQUE_INDEX },
    );
    created = true;
    console.log(`created ${XP_LEDGER_UNIQUE_INDEX}`);
  }

  let dropped = false;
  if (plan.hasObsolete) {
    await XpLedger.collection.dropIndex(XP_LEDGER_OBSOLETE_INDEX);
    dropped = true;
    console.log(`dropped ${XP_LEDGER_OBSOLETE_INDEX}`);
  }

  return { created, dropped, blocked: false };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI is not set.'); process.exit(1); }

  await mongoose.connect(uri);
  const result = await migrate(apply);
  await mongoose.disconnect();

  if (result.blocked) process.exit(1);
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}
