/**
 * Repair lead activities written by the old createMeeting bug.
 *
 *   node dist/scripts/repairMeetingActivities.js            # plan only
 *   node dist/scripts/repairMeetingActivities.js --apply
 *
 * WHY. createMeeting pushed `{ type:'meeting', note, performedBy }` with $push, which skips
 * validation. LeadActivitySchema requires `description` and `createdBy`, so every later
 * lead.save() on such a lead failed validation — stage changes, notes, conversions.
 *
 * WHAT IT DOES. For each such activity: description ← note (or a fallback text),
 * createdBy ← performedBy, then removes the two wrong fields. Nothing else on the lead changes.
 * Plan-only by default.
 */
import mongoose from 'mongoose';

const APPLY = process.argv.includes('--apply');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  const leads = mongoose.connection.collection('leads');
  console.log((APPLY ? '' : '[PLAN ONLY] ') + 'repairing meeting activities with missing description/createdBy\n');

  const broken = { activities: { $elemMatch: { $or: [{ description: { $exists: false } }, { createdBy: { $exists: false } }] } } };
  const cursor = leads.find(broken, { projection: { name: 1, tenantId: 1, activities: 1 } });

  let leadCount = 0, activityCount = 0, unfixable = 0;
  for await (const lead of cursor) {
    leadCount += 1;
    const sets: Record<string, any> = {};
    const unsets: Record<string, ''> = {};
    (lead.activities || []).forEach((a: any, i: number) => {
      if (a.description && a.createdBy) return;
      activityCount += 1;
      if (!a.description) sets[`activities.${i}.description`] = a.note || `${a.type || 'activity'} (details not recorded)`;
      if (!a.createdBy) {
        if (a.performedBy) sets[`activities.${i}.createdBy`] = a.performedBy;
        else unfixable += 1;
      }
      if ('note' in a) unsets[`activities.${i}.note`] = '';
      if ('performedBy' in a) unsets[`activities.${i}.performedBy`] = '';
    });
    console.log(`  ${lead._id}  ${lead.name}  → ${Object.keys(sets).length} field(s) set`);
    if (APPLY && Object.keys(sets).length) {
      await leads.updateOne({ _id: lead._id }, { $set: sets, ...(Object.keys(unsets).length ? { $unset: unsets } : {}) });
    }
  }

  console.log(`\nleads affected: ${leadCount}, activities repaired: ${activityCount}, activities still without an author: ${unfixable}`);
  if (!APPLY) console.log('Plan only. Re-run with --apply to write.');
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
