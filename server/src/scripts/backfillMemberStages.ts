/**
 * Backfill career stage + background for members who joined before staging existed.
 *
 * `memberAxes()` derives these on read, so the product behaves correctly without this.
 * The stored value still matters:
 *
 *   - the admin Members list and any future query that filters or reports by stage reads
 *     the stored field, not the derived one
 *   - a derived-only value is invisible, so "why is this member seeing placement
 *     questions?" cannot be answered by looking at their record
 *
 * Only fills what is EMPTY. A stage an admin set by hand is never overwritten, and a
 * member whose degree/year we cannot read is left alone rather than guessed into a
 * segment — mis-staging is worse than not staging.
 *
 * Run: npx ts-node src/scripts/backfillMemberStages.ts <tenantId> [--apply]
 * Without --apply it prints what it would change and writes nothing.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import { resolveCareerProfile } from '../services/careerStageService';

dotenv.config();

async function run() {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId) { console.error('Usage: backfillMemberStages.ts <tenantId> [--apply]'); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI as string);

  const members: any[] = await User.find({
    tenantId, 'passport.product': { $exists: true, $ne: null },
  }).select('firstName lastName email passport').lean();

  let filled = 0, already = 0, unknown = 0;
  console.log(`${members.length} CareerPilot member(s)\n`);

  for (const u of members) {
    const p = u.passport || {};
    if (p.stage) { already++; continue; }

    const d = resolveCareerProfile({
      degree: p.degree, yearOfStudy: p.yearOfStudy,
      program: p.program, branch: p.branch,
      graduationMonth: p.graduationMonth ?? null,
      graduationYear: p.graduationYear ?? null,
      graduated: p.graduated === true,
    });

    if (!d.stage) {
      console.log(`  ? ${String(u.email).padEnd(36)} degree=${p.degree || '-'} year=${p.yearOfStudy || '-'} → cannot derive, left alone`);
      unknown++;
      continue;
    }

    console.log(`  ${apply ? '✓' : '·'} ${String(u.email).padEnd(36)} ${String(p.degree || '-').padEnd(9)}${String(p.yearOfStudy || '-').padEnd(11)}→ ${d.stage} / ${d.background}`);
    if (apply) {
      await User.updateOne({ _id: u._id }, { $set: {
        'passport.stage': d.stage,
        'passport.background': p.background || d.background,
        'passport.monthsToGraduation': d.monthsToGraduation,
        'passport.stageComputedAt': new Date(),
      } });
    }
    filled++;
  }

  console.log(`\n${apply ? 'Filled' : 'Would fill'} ${filled}; ${already} already staged; ${unknown} could not be derived.`);
  if (!apply && filled) console.log('Re-run with --apply to write.');

  await mongoose.disconnect();
}

if (require.main === module) run().catch(e => { console.error(e); process.exit(1); });
