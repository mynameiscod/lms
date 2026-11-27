/**
 * Leave each lead with one open follow-up.
 *
 * WHY. Scheduling a follow-up used to add a task next to the old open ones, so a lead piled up 2, 3 or
 * more open follow-ups and "Mark this follow-up done" still left the rest pending. New follow-ups now
 * replace the old ones (services/leadFollowUpService); this does the same for leads from before.
 *
 * For every lead with more than one open follow-up, the most recently CREATED one is kept (the
 * latest plan the counsellor made) and the others become `cancelled` with "Replaced by a newer
 * follow-up". The lead's next follow-up is set to the kept one. Nothing is deleted. Safe to run again.
 *
 * DRY RUN unless --apply.
 *
 *   npx ts-node src/scripts/oneOpenFollowUpPerLead.ts [<tenantId>] [--apply]
 *   node dist/scripts/oneOpenFollowUpPerLead.js [<tenantId>] [--apply]      # in the container
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import FollowUpReminder from '../models/FollowUpReminder';
import Lead from '../models/Lead';
import { OPEN_FOLLOW_UP_STATUSES, REPLACED_NOTE } from '../services/leadFollowUpService';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const onlyTenant = args.find(a => !a.startsWith('--')) || '';
  await mongoose.connect(uri);

  const match: any = { status: { $in: OPEN_FOLLOW_UP_STATUSES } };
  // tenantId is an ObjectId; an aggregate does not cast it.
  if (onlyTenant) match.tenantId = new mongoose.Types.ObjectId(onlyTenant);
  const groups = await FollowUpReminder.aggregate([
    { $match: match },
    { $sort: { createdAt: -1, _id: -1 } },
    { $group: { _id: '$leadId', ids: { $push: '$_id' }, keepAt: { $first: '$scheduledAt' }, tenantId: { $first: '$tenantId' }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
  ]).allowDiskUse(true);

  const extra = groups.reduce((s, g) => s + g.n - 1, 0);
  console.log(`\n=== One open follow-up per lead (${apply ? 'APPLY' : 'DRY RUN'}) ===`);
  console.log(`${groups.length} lead(s) with more than one open follow-up; ${extra} follow-up(s) to close.`);

  if (apply) {
    let closed = 0;
    for (const g of groups) {
      const r = await FollowUpReminder.updateMany(
        { _id: { $in: g.ids.slice(1) }, status: { $in: OPEN_FOLLOW_UP_STATUSES } },
        { $set: { status: 'cancelled', notes: REPLACED_NOTE } },
      );
      closed += r.modifiedCount;
      await Lead.updateOne({ _id: g._id, tenantId: g.tenantId }, { $set: { nextFollowUp: g.keepAt } });
    }
    console.log(`Closed ${closed} follow-up(s).`);
  } else {
    console.log('Nothing changed. Run again with --apply.');
  }
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
