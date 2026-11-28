/**
 * Give quizzes and assignments that were assigned BEFORE 28 Nov 2026 their "last assigned" time, so the
 * curriculum picker puts recently given-out ones first from day one, not only after the next assign.
 *
 * Source: the Assign-to-Batches rows (AssessmentSchedule, source "standalone"); the latest change on any
 * of an item's rows is taken as when it was last assigned. Only items with no lastAssignedAt yet are
 * touched, so it never overwrites a real assign and is safe to run again. Optional: without it, items
 * simply move up the next time they are assigned.
 *
 * DRY RUN unless --apply.
 *
 *   npx ts-node src/scripts/backfillLastAssignedAt.ts [--apply]
 *   node dist/scripts/backfillLastAssignedAt.js [--apply]      # in the container
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import AssessmentSchedule from '../models/AssessmentSchedule';
import Quiz from '../models/Quiz';
import Assignment from '../models/Assignment';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  const apply = process.argv.includes('--apply');
  await mongoose.connect(uri);
  console.log(apply ? 'APPLYING' : 'DRY RUN');

  const rows: { _id: { t: string; id: mongoose.Types.ObjectId }; at: Date }[] = await AssessmentSchedule.aggregate([
    { $match: { source: 'standalone' } },
    { $group: { _id: { t: '$contentType', id: '$contentId' }, at: { $max: { $ifNull: ['$updatedAt', '$createdAt'] } } } },
  ]);

  let quizzes = 0; let assignments = 0;
  for (const r of rows) {
    if (!r.at) continue;
    const model: any = r._id.t === 'quiz' ? Quiz : Assignment;
    const filter = { _id: r._id.id, $or: [{ lastAssignedAt: null }, { lastAssignedAt: { $exists: false } }] };
    const hit = apply
      ? (await model.updateOne(filter, { $set: { lastAssignedAt: r.at } })).modifiedCount
      : await model.countDocuments(filter);
    if (hit) { if (r._id.t === 'quiz') quizzes++; else assignments++; }
  }
  console.log(`Quizzes: ${quizzes} ${apply ? 'updated' : 'to update'}. Assignments: ${assignments} ${apply ? 'updated' : 'to update'}.`);
  if (!apply) console.log('Nothing written. Run again with --apply.');
  await mongoose.disconnect();
}

main().catch(async (e) => { console.error(e); await mongoose.disconnect().catch(() => undefined); process.exit(1); });
