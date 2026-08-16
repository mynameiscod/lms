/**
 * Install the one-live-interview lock on passportinterviews.
 *
 *   npx ts-node src/scripts/migratePassportInterviewLiveIndex.ts            # dry run — reports, changes nothing
 *   npx ts-node src/scripts/migratePassportInterviewLiveIndex.ts --apply    # performs the migration
 *
 * WHY THIS SCRIPT HAS TO EXIST.
 * The new guarantee is a partial unique index over `live: true`, and `live` is a field no
 * existing document has. Deploying the schema alone therefore protects only sittings started
 * AFTER the deploy: every interview already open the moment the new code ships is invisible
 * to the index, and a member with one of those could still race two starts. Mongoose builds
 * indexes it finds in a schema and NEVER reconciles the data underneath them — the backfill
 * is this script's real job.
 *
 * ORDER MATTERS: CLEAN, THEN BUILD, THEN BACKFILL.
 *  1. Clear any `live: true` left on a terminal sitting. Two of those for one member would
 *     make the index unbuildable, and they are meaningless rows in it either way.
 *  2. Create the index. Done before the backfill so that from this second onward every NEW
 *     interview is protected, including ones the running application inserts mid-migration.
 *  3. Backfill `live: true` onto the interviews that are open right now, one per member.
 *
 * A MEMBER WITH TWO OPEN SITTINGS IS REPORTED, NOT REPAIRED.
 * They exist because the old read-then-insert allowed them. Exactly one — the most recent —
 * is marked live; the older ones keep the status they have and simply stay out of the index,
 * which leaves them behaving precisely as they do today: findable, resumable, finishable. The
 * alternative is a script that silently abandons somebody's transcript, and no migration
 * should do that on its own authority. They are printed so an operator can decide.
 *
 * SAFE TO RUN REPEATEDLY. It reports what it finds, does only what is missing, and treats an
 * already-migrated database as success rather than as an error.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PassportInterview, { PASSPORT_INTERVIEW_LIVE_INDEX } from '../models/PassportInterview';

dotenv.config();

const LIVE_STATUSES = ['in_progress', 'finalizing'];

interface OpenGroup {
  tenantId: string;
  studentId: string;
  /** Open sittings for this member, newest first. */
  ids: string[];
  /** Whether one of them is already flagged, i.e. this member is already migrated. */
  alreadyFlagged: boolean;
}

interface Plan {
  hasIndex: boolean;
  /** Terminal sittings still carrying the flag. Should be zero outside a half-run migration. */
  strays: number;
  /** Members with an open sitting, and how many each has. */
  open: OpenGroup[];
}

export async function inspect(): Promise<Plan> {
  const existing = await PassportInterview.collection.indexes();
  const hasIndex = existing.some((i: any) => i.name === PASSPORT_INTERVIEW_LIVE_INDEX);

  const strays = await PassportInterview.countDocuments({
    status: { $nin: LIVE_STATUSES }, live: true,
  });

  const grouped = await PassportInterview.aggregate([
    { $match: { status: { $in: LIVE_STATUSES } } },
    { $sort: { createdAt: -1 } },
    {
      $group: {
        _id: { tenantId: '$tenantId', studentId: '$studentId' },
        ids: { $push: '$_id' },
        flagged: { $sum: { $cond: [{ $eq: ['$live', true] }, 1, 0] } },
      },
    },
  ]);

  return {
    hasIndex,
    strays,
    open: grouped.map((g: any) => ({
      tenantId: g._id.tenantId,
      studentId: String(g._id.studentId),
      ids: g.ids.map((i: any) => String(i)),
      alreadyFlagged: g.flagged > 0,
    })),
  };
}

export async function migrate(apply: boolean): Promise<{
  strays: number; created: boolean; flagged: number; duplicates: number;
}> {
  const plan = await inspect();

  const needsFlag = plan.open.filter(g => !g.alreadyFlagged);
  const duplicates = plan.open.filter(g => g.ids.length > 1);

  console.log(`index ${PASSPORT_INTERVIEW_LIVE_INDEX}: ${plan.hasIndex ? 'present' : 'MISSING'}`);
  console.log(`terminal sittings still flagged live: ${plan.strays}`);
  console.log(`members with an open sitting: ${plan.open.length} (${needsFlag.length} to backfill)`);

  if (duplicates.length) {
    console.warn(`\n${duplicates.length} member(s) already have MORE THAN ONE open sitting.`);
    console.warn('The newest of each is the one that will hold the lock; the rest are left as they are.');
    for (const g of duplicates.slice(0, 20)) {
      console.warn(`  ${g.tenantId} / ${g.studentId} → ${g.ids.length} open: ${g.ids.join(', ')}`);
    }
  }

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to make these changes.');
    return { strays: 0, created: false, flagged: 0, duplicates: duplicates.length };
  }

  // 1. Clean. A terminal sitting has no business in the live index, and two of them for one
  //    member would stop the index being built at all.
  let strays = 0;
  if (plan.strays) {
    const r = await PassportInterview.updateMany(
      { status: { $nin: LIVE_STATUSES }, live: true },
      { $set: { live: false } },
    );
    strays = r.modifiedCount || 0;
    console.log(`released ${strays} stale lock(s) on finished sittings`);
  }

  // 2. Build. From here on, every new interview is protected — including any the running
  //    application inserts while the backfill below is still working through the old ones.
  let created = false;
  if (!plan.hasIndex) {
    await PassportInterview.collection.createIndex(
      { tenantId: 1, studentId: 1 },
      { unique: true, partialFilterExpression: { live: true }, name: PASSPORT_INTERVIEW_LIVE_INDEX },
    );
    created = true;
    console.log(`created ${PASSPORT_INTERVIEW_LIVE_INDEX}`);
  }

  /**
   * 3. Backfill, one sitting per member.
   *
   * Conditioned on the document still being open, so an interview that the member finished
   * while this script was running is not dragged back into the index behind them.
   */
  let flagged = 0;
  for (const g of needsFlag) {
    const r = await PassportInterview.updateOne(
      { _id: g.ids[0], status: { $in: LIVE_STATUSES } },
      { $set: { live: true } },
    );
    flagged += r.modifiedCount || 0;
  }
  console.log(`locked ${flagged} open sitting(s)`);

  return { strays, created, flagged, duplicates: duplicates.length };
}

async function main() {
  const apply = process.argv.includes('--apply');
  const uri = process.env.MONGO_URL || process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI is not set.'); process.exit(1); }

  await mongoose.connect(uri);
  await migrate(apply);
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(e => { console.error(e); process.exit(1); });
}
