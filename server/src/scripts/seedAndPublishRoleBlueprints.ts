/**
 * Give a tenant the role blueprints its setup screen already offers, and publish them.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx ts-node src/scripts/seedAndPublishRoleBlueprints.ts <tenantId>
 *   npx ts-node src/scripts/seedAndPublishRoleBlueprints.ts <tenantId> --apply
 *   npx ts-node src/scripts/seedAndPublishRoleBlueprints.ts <tenantId> --apply --no-publish
 *
 * ── THE GAP THIS CLOSES ───────────────────────────────────────────────────────────────────
 *
 * CareerPilot's setup screen offers a list of target roles. The assessment then measures the
 * student against that role's blueprint — and refuses outright if it is missing or unpublished,
 * which is the correct behaviour: assessing somebody against a draft is worse than telling an
 * admin to finish it.
 *
 * What nothing did was create them. `seedRoleBlueprints` exists and is reachable from the admin
 * API, and it writes every blueprint `published: false` because publishing is an editorial act.
 * So a tenant that never ran it and then never published each role by hand shows a student:
 *
 *   "The Software Engineer skill blueprint has not been published yet.
 *    Ask your administrator to publish it."
 *
 * — on a tenant where there was no blueprint to publish. Measured on this one: nineteen roles on
 * offer, ZERO blueprints, so every student who named any role at all was refused an assessment
 * and, with no Skill DNA to compose from, a roadmap after it. Only "I'm not sure yet" worked,
 * because that path reads the stage skill set instead.
 *
 * ── WHY THIS PUBLISHES BY DEFAULT WHERE THE ADMIN ROUTE DOES NOT ──────────────────────────
 *
 * The admin route is for a human editing one blueprint and deciding it is ready. This is for
 * standing a tenant up, and a seeded blueprint that nobody can be assessed against is not a
 * useful intermediate state — it is the bug above, one step later. `--no-publish` keeps the
 * two-step behaviour for anyone who wants to review first.
 *
 * It never publishes a blueprint it did not just create, and never touches one an admin has
 * edited: `seedRoleBlueprints` skips roles that already have one, and only the newly inserted
 * keys are published here.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import RoleSkillBlueprint from '../models/RoleSkillBlueprint';
import { seedRoleBlueprints } from '../services/roleSkillBlueprintSeedService';
import { ensureCareerRoles } from '../services/careerRoleService';
import { getRoleSkillBlueprint } from '../services/roleSkillBlueprintService';

async function run(): Promise<void> {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  const publish = !process.argv.includes('--no-publish');

  if (!tenantId) {
    console.error('Usage: seedAndPublishRoleBlueprints.ts <tenantId> [--apply] [--no-publish]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  console.log(`\nROLE BLUEPRINTS  ·  tenant ${tenantId}`);
  console.log(apply ? '\nAPPLYING\n' : '\nDRY RUN — pass --apply to write\n');

  const before = await RoleSkillBlueprint.find({ tenantId })
    .select('roleKey published').lean() as any[];
  console.log(`  already present: ${before.length} (${before.filter(b => b.published).length} published)`);

  /* The app seeds a tenant's career roles lazily, on the first read of a role list. A tenant
     being provisioned has had no such read, so without this every blueprint is refused for a
     missing role and the step writes nothing. Insert-only: an admin's edits are never undone. */
  if (apply) await ensureCareerRoles(tenantId);

  const report = await seedRoleBlueprints(tenantId, { dryRun: !apply, updatedBy: 'role-blueprint-seed' });

  console.log(`  catalogue holds ${report.total} default blueprints`);
  console.log(`  would insert:    ${report.inserted.length}${report.inserted.length ? ` — ${report.inserted.join(', ')}` : ''}`);
  console.log(`  skipped:         ${report.skipped.length} (already present)`);
  if (report.missingRoles.length) {
    console.log(`  MISSING ROLES:   ${report.missingRoles.join(', ')}`);
    console.log('    These roles are in the blueprint catalogue but not in this tenant\'s CareerRole list,');
    console.log('    so nothing was written for them. Seed the roles first.');
  }
  if (report.droppedRequirements) {
    console.log(`  dropped requirements: ${report.droppedRequirements} (skill not in the catalogue)`);
  }

  if (apply && publish && report.inserted.length) {
    const res = await RoleSkillBlueprint.updateMany(
      { tenantId, roleKey: { $in: report.inserted }, published: { $ne: true } },
      { $set: { published: true, updatedBy: 'role-blueprint-seed' } },
    );
    console.log(`\n  published ${res.modifiedCount} newly seeded blueprint(s).`);
  } else if (apply && !publish) {
    console.log('\n  --no-publish: left as drafts for review.');
  }

  const after = await RoleSkillBlueprint.find({ tenantId })
    .select('roleKey published').lean() as any[];
  /* `skillActive` and `missing` are not stored — the app resolves them against the live skill
     catalogue on read. Reading the raw documents here reported every blueprint as unusable. */
  const usableCount = new Map<string, number>();
  for (const b of after) {
    const resolved = await getRoleSkillBlueprint(tenantId, b.roleKey);
    usableCount.set(b.roleKey, (resolved?.requirements || []).filter(r => r.active && r.skillActive && !r.missing).length);
  }
  const unusable = after.filter(b => !b.published || !usableCount.get(b.roleKey));
  console.log(`\n  now present: ${after.length}, of which ${after.length - unusable.length} are assessable.`);
  if (unusable.length) {
    console.log('  NOT assessable (a student naming one of these is still refused):');
    for (const b of unusable) {
      console.log(`    ${String(b.roleKey).padEnd(34)} published=${!!b.published} usable requirements=${usableCount.get(b.roleKey) || 0}`);
    }
  }
  console.log('');
  await mongoose.disconnect();

  /* Zero assessable blueprints after an apply is a failure, not a quiet success: the provisioner
     reads the exit code, and "ok" here once hid a tenant where no student could be assessed. */
  if (apply && after.length === unusable.length) {
    console.error('  FAILED: no assessable role blueprint on this tenant after applying.');
    process.exit(1);
  }
}

run().catch(async (e) => {
  console.error('\nFAILED:', e?.message || e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
