/**
 * Backfill `audience` on Quiz and Assignment rows (Content audience, Phase 1).
 *
 * WHY. `audience` says which student population sees an item in its lists: LMS students,
 * CareerPilot members, or both. Rows written before the field existed have none. The LMS list
 * paths already read a missing audience as 'lms', and keep a `unitCode` guard so CareerPilot
 * unit items cannot leak meanwhile — this script makes the stored data say what those guards
 * assume, so the guards can eventually go.
 *
 * WHAT IT WRITES, per tenant:
 *   - rows bound to a CareerPilot unit (non-empty unitCode) whose audience is missing or 'lms'
 *     → 'careerpilot'. An explicit 'all' is an admin's choice and is left alone.
 *   - every other row with no audience field → 'lms' (what it has always been).
 *
 * IDEMPOTENT: a second run finds nothing to change. DRY RUN unless --apply is passed.
 *
 *   npx ts-node src/scripts/backfillContentAudience.ts                 # all tenants, dry run
 *   npx ts-node src/scripts/backfillContentAudience.ts <tenantId>      # one tenant, dry run
 *   npx ts-node src/scripts/backfillContentAudience.ts [<tenantId>] --apply
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Quiz from '../models/Quiz';
import Assignment from '../models/Assignment';

const hasUnit = { unitCode: { $exists: true, $nin: [null, ''] } };
const noUnit = { $or: [{ unitCode: { $exists: false } }, { unitCode: { $in: [null, ''] } }] };
const unitNeedsCp = { ...hasUnit, $or: [{ audience: { $exists: false } }, { audience: null }, { audience: 'lms' }] };
const plainNeedsLms = { ...noUnit, $and: [{ $or: [{ audience: { $exists: false } }, { audience: null }] }] };

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const onlyTenant = args.find(a => !a.startsWith('--')) || '';
  if (onlyTenant && !mongoose.isValidObjectId(onlyTenant)) { console.error(`Not a tenant id: ${onlyTenant}`); process.exit(1); }

  await mongoose.connect(uri);
  // Raw collections: the models' `audience` default must not colour what "missing" means here.
  const quizzes = Quiz.collection;
  const assignments = Assignment.collection;

  const tenantIds = onlyTenant
    ? [onlyTenant]
    : [...new Set([
      ...(await quizzes.distinct('tenantId')).map(String),
      ...(await assignments.distinct('tenant')).map(String),
    ])].filter(Boolean).sort();

  console.log(`\n=== Content audience backfill (${apply ? 'APPLY' : 'DRY RUN'}) — ${tenantIds.length} tenant(s) ===`);
  const total = { quizCp: 0, quizLms: 0, asgCp: 0, asgLms: 0 };

  for (const t of tenantIds) {
    const qf = { tenantId: t };
    const af = mongoose.isValidObjectId(t) ? { tenant: new mongoose.Types.ObjectId(t) } : null;

    const quizCp = await quizzes.countDocuments({ ...qf, ...unitNeedsCp });
    const quizLms = await quizzes.countDocuments({ ...qf, ...plainNeedsLms });
    const asgCp = af ? await assignments.countDocuments({ ...af, ...unitNeedsCp }) : 0;
    const asgLms = af ? await assignments.countDocuments({ ...af, ...plainNeedsLms }) : 0;

    if (apply) {
      if (quizCp) await quizzes.updateMany({ ...qf, ...unitNeedsCp }, { $set: { audience: 'careerpilot' } });
      if (quizLms) await quizzes.updateMany({ ...qf, ...plainNeedsLms }, { $set: { audience: 'lms' } });
      if (af && asgCp) await assignments.updateMany({ ...af, ...unitNeedsCp }, { $set: { audience: 'careerpilot' } });
      if (af && asgLms) await assignments.updateMany({ ...af, ...plainNeedsLms }, { $set: { audience: 'lms' } });
    }

    total.quizCp += quizCp; total.quizLms += quizLms; total.asgCp += asgCp; total.asgLms += asgLms;
    console.log(`  ${t}  quizzes → careerpilot ${quizCp}, → lms ${quizLms}  |  assignments → careerpilot ${asgCp}, → lms ${asgLms}`);
  }

  console.log(`TOTAL  quizzes → careerpilot ${total.quizCp}, → lms ${total.quizLms}  |  assignments → careerpilot ${total.asgCp}, → lms ${total.asgLms}`);
  console.log(apply ? 'APPLIED.' : '(dry run — pass --apply to write)');
  await mongoose.disconnect();
}

main().catch(async (e) => { console.error(e); await mongoose.disconnect().catch(() => {}); process.exit(1); });
