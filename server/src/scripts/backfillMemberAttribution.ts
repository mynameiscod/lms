/**
 * Save "how did this member find us" for CareerPilot members who joined before sign-up sources were
 * captured live — reconstructed from their payment or their first recorded visits (see
 * services/attributionInference.ts). Activity rows expire after 90 days, so running this keeps the
 * answer for good.
 *
 *   npx ts-node src/scripts/backfillMemberAttribution.ts <tenantId>            # dry run
 *   npx ts-node src/scripts/backfillMemberAttribution.ts <tenantId> --apply
 *   production: node dist/scripts/backfillMemberAttribution.js <tenantId> --apply
 *
 * Only members with NO attribution are touched; a live-captured source is never overwritten.
 * Written members are marked passport.attributionReconstructed = 'payment' | 'activity'.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User';
import { inferAttribution } from '../services/attributionInference';

dotenv.config();

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId || !mongoose.isValidObjectId(tenantId)) {
    console.error('Usage: backfillMemberAttribution <tenantId> [--apply]');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI as string);
  const members: any[] = await User.find({
    tenantId: new mongoose.Types.ObjectId(tenantId),
    'passport.product': 'career_passport',
    'passport.attribution': { $exists: false },
  }).select('_id email').lean();

  console.log(`\nMEMBER SIGN-UP SOURCES — tenant ${tenantId} — ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`  members with no source on record: ${members.length}\n`);
  const tally: Record<string, number> = { payment: 0, activity: 0, none: 0 };
  const sources: Record<string, number> = {};
  for (const m of members) {
    const r = await inferAttribution(tenantId, String(m._id)).catch(() => null);
    if (!r) { tally.none++; continue; }
    tally[r.from]++;
    const t: any = r.touch;
    const label = t.gclid ? 'google ads' : t.fbclid ? 'meta ads' : t.utm_source || (t.referrer ? `ref:${String(t.referrer).split('/')[0]}` : 'direct');
    sources[label] = (sources[label] || 0) + 1;
    if (apply) {
      await User.updateOne({ _id: m._id, 'passport.attribution': { $exists: false } }, {
        $set: { 'passport.attribution': { first_touch: r.touch }, 'passport.attributionReconstructed': r.from },
      });
    }
  }
  console.log(`  reconstructed from a payment:  ${tally.payment}`);
  console.log(`  reconstructed from activity:   ${tally.activity}`);
  console.log(`  nothing on record (stay Unknown): ${tally.none}`);
  console.log('\n  sources found:');
  for (const [k, v] of Object.entries(sources).sort((a, b) => b[1] - a[1])) console.log(`    ${k.padEnd(28)} ${v}`);
  console.log(apply ? '\nWritten.' : '\nDry run — re-run with --apply to save.');
  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
