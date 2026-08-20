/**
 * Install the Backend Engineer pilot assessment content for one tenant.
 *
 * Run:
 *   npx ts-node src/scripts/seedBackendPilotBank.ts <tenantId> --dry-run
 *   npx ts-node src/scripts/seedBackendPilotBank.ts <tenantId>
 *
 * Idempotent: a second run creates nothing and reports every key as skipped. It never
 * overwrites an existing question, so an admin's correction survives a redeploy.
 *
 * This does NOT install CareerSkills or role blueprints — those have their own admin
 * screens ("Install missing" and "Install defaults") and are steps 1-3 of the launch
 * sequence. This is step 4.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { seedBackendPilotContent } from '../services/backendPilotSeedService';

dotenv.config();

async function main() {
  const tenantId = process.argv[2];
  const dryRun = process.argv.includes('--dry-run');

  if (!tenantId) {
    console.error('Usage: seedBackendPilotBank.ts <tenantId> [--dry-run]');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  try {
    const r = await seedBackendPilotContent({ tenantId, createdBy: 'seed-script', dryRun });

    console.log('');
    console.log(dryRun ? '=== DRY RUN — nothing was written ===' : '=== Backend pilot content installed ===');
    console.log(`  questions created : ${r.questions.created.length}`);
    console.log(`  questions skipped : ${r.questions.skipped.length} (already present)`);
    console.log(`  evidence created  : ${r.evidence.created}  (of which existing-bank reuse: ${r.evidence.reusedExisting})`);
    console.log(`  evidence present  : ${r.evidence.alreadyPresent}`);
    console.log('');
    console.log('  by skill:');
    for (const [skill, n] of Object.entries(r.bySkill)) {
      console.log(`    ${skill.padEnd(22)} authored=${n.authored} reused=${n.reused}`);
    }
    console.log('');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
