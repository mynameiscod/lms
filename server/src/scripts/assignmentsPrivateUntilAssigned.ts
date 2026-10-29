/**
 * Turn "open to everyone" LMS assignments into batch-wise ones with no batches (= nobody yet).
 *
 * WHY. Assignments are reusable content: publishing puts one in the bank, and it reaches students
 * only once it is assigned (a batch, chosen students, or Assign to Batches). Rows written by the
 * old form, the CSV import, AI generation and their copies were stored as `accessibleTo: 'everyone'`
 * and so showed to every student the moment they were published. The read paths no longer deliver
 * "everyone" to anyone; this script makes the stored data say the same, so the edit form shows
 * the truth. External (link) assignments are left alone.
 *
 * A student keeps an assignment they already started or handed in, whatever this changes.
 * The report lists, per tenant, how many published rows change and how many of those have work.
 *
 * IDEMPOTENT: a second run finds nothing to change. DRY RUN unless --apply is passed.
 *
 *   npx ts-node src/scripts/assignmentsPrivateUntilAssigned.ts                 # all tenants, dry run
 *   npx ts-node src/scripts/assignmentsPrivateUntilAssigned.ts <tenantId>      # one tenant, dry run
 *   npx ts-node src/scripts/assignmentsPrivateUntilAssigned.ts [<tenantId>] --apply
 *   node dist/scripts/assignmentsPrivateUntilAssigned.js [<tenantId>] [--apply] # in the container
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import Assignment from '../models/Assignment';
import Submission from '../models/Submission';

const open = { accessibleTo: 'everyone', isExternalAssignment: { $ne: true } };

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const onlyTenant = args.find(a => !a.startsWith('--')) || '';
  if (onlyTenant && !mongoose.isValidObjectId(onlyTenant)) { console.error(`Not a tenant id: ${onlyTenant}`); process.exit(1); }

  await mongoose.connect(uri);
  // Raw collection: the model's new default must not colour what is stored.
  const assignments = Assignment.collection;
  const tenantIds = onlyTenant ? [onlyTenant] : (await assignments.distinct('tenant', open)).map(String).filter(Boolean).sort();

  console.log(`\n=== Assignments private until assigned (${apply ? 'APPLY' : 'DRY RUN'}) — ${tenantIds.length} tenant(s) ===`);
  let total = 0;
  for (const t of tenantIds) {
    const filter = { ...open, tenant: new mongoose.Types.ObjectId(t) };
    const rows = await assignments.find(filter, { projection: { _id: 1, status: 1, unitCode: 1 } }).toArray();
    if (!rows.length) continue;
    const published = rows.filter(r => r.status === 'published' && !r.unitCode);
    const withWork = published.length
      ? (await Submission.distinct('assignment', { assignment: { $in: published.map(r => r._id) } })).length : 0;
    console.log(`  ${t}: ${rows.length} row(s) · ${published.length} published LMS · ${withWork} with student work (kept for those students)`);
    if (apply) await assignments.updateMany(filter, { $set: { accessibleTo: 'batch_wise' } });
    total += rows.length;
  }
  console.log(`\n${apply ? 'Changed' : 'Would change'} ${total} assignment(s).${apply ? '' : ' Run again with --apply to write.'}\n`);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
