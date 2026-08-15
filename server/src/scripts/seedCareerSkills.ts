/**
 * Install the canonical CareerPilot skill taxonomy.
 *
 *   npx ts-node src/scripts/seedCareerSkills.ts            # dry run — reports, writes nothing
 *   npx ts-node src/scripts/seedCareerSkills.ts --apply    # installs anything missing
 *
 * Dry run by default, deliberately: this touches a global collection shared by every
 * tenant, and the person running it should see what it would do before it does it.
 *
 * NOT run at startup and NOT run from any read path. Seventy nodes behind a page load
 * would be a cost paid forever to answer a question that changes once a quarter. The same
 * operation is available from the admin Skill Graph screen for anyone without shell access.
 *
 * INSERT-ONLY. A key that already exists is left exactly as it is, so renamed skills keep
 * their names and deactivated skills stay deactivated. Safe to run as often as you like.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedCareerSkills } from '../services/careerSkillSeedService';
import { auditTaxonomy } from '../services/careerSkillSeedService';

dotenv.config();

async function main() {
  const apply = process.argv.includes('--apply');

  const problems = auditTaxonomy();
  if (problems.length) {
    console.error('The shipped taxonomy is inconsistent — nothing was installed:');
    problems.forEach(p => console.error(`  - ${p}`));
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI is not set.'); process.exit(1); }
  await mongoose.connect(uri);

  const report = await seedCareerSkills({ dryRun: !apply, updatedBy: 'seed-script' });

  console.log(`\nCanonical taxonomy: ${report.total} skills`);
  console.log(`  already present : ${report.skipped.length}`);
  console.log(`  ${apply ? 'installed' : 'would install'}: ${report.inserted.length}`);
  if (report.inserted.length) {
    console.log('\n' + report.inserted.map(k => `    + ${k}`).join('\n'));
  }
  if (!apply) console.log('\nDry run. Re-run with --apply to write.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(async (e) => {
  console.error('Seed failed:', e?.message || e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
