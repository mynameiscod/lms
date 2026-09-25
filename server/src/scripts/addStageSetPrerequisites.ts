/**
 * Add the earlier-year prerequisites to a tenant's existing stage skill set, without disturbing
 * anything already in it.
 *
 * ── WHY THIS EXISTS AND THE SEEDER DOES NOT DO IT ─────────────────────────────────────────
 *
 * A stage set has to hold a skill before the entry paper can ask about it, and the bridge counts
 * only MEASURED skills as gaps. Year 2 declared fourteen Year-1 prerequisites that never reached
 * its stage set, so eleven of them could never be asked, never be found missing, and never be
 * taught.
 *
 * The obvious move is to re-run seedFoundationStageSkillSet with --replace. Measured against the
 * real tenant, that is the wrong move: the stored set is CURATED and has 54 skills switched on,
 * while the module-derived set switches on only the UNIVERSAL topics — 46. Replacing would add
 * the 14 prerequisites and deactivate 22 other skills, including PYTHON_MODULES, CODE_REVIEW,
 * JS_ASYNC, CLOUD_FUNDAMENTALS, PORTFOLIO_EVIDENCE and INTERNSHIP_READINESS: precisely the
 * skills whose questions were written and imported so that they COULD be asked. Fixing the
 * bridge by silently switching off a dozen skills somebody deliberately enabled is not a fix.
 *
 * So this adds and never removes. A skill already in the set is left exactly as the tenant has
 * it — importance, target, active flag and all — because their curation outranks a default.
 * Only genuinely absent skills are appended, as SUPPORTING and active: there to be ASKED, not
 * promoted to something the year is graded on.
 *
 * ── USAGE ─────────────────────────────────────────────────────────────────────────────────
 *
 *   ts-node src/scripts/addStageSetPrerequisites.ts <tenantId> --year2          # dry run
 *   ts-node src/scripts/addStageSetPrerequisites.ts <tenantId> --year2 --apply  # write
 *
 * Dry run by default, and it names every skill it would add and every one it is leaving alone.
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { buildStageRequirements, BUILD_STAGE } from '../seeds/careerPilot/year2StageSkillSet';

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  const year2 = process.argv.includes('--year2');

  if (!tenantId || !year2) {
    console.error('Usage: addStageSetPrerequisites.ts <tenantId> --year2 [--apply]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || '');
  const col = mongoose.connection.db!.collection('stageskillsets');

  /*
   * tenantId is stored as a STRING on this collection, not an ObjectId. Casting it matched
   * nothing and the script reported "no stage set" for a tenant that plainly has one. Both
   * forms are accepted rather than assuming, because other collections here do use ObjectIds.
   */
  const stored: any = await col.findOne({
    stage: BUILD_STAGE,
    $or: [
      { tenantId },
      ...(mongoose.Types.ObjectId.isValid(tenantId) ? [{ tenantId: new mongoose.Types.ObjectId(tenantId) }] : []),
    ],
  });
  if (!stored) {
    console.error(`No "${BUILD_STAGE}" stage skill set for tenant ${tenantId}. Seed one first.`);
    process.exit(1);
  }

  const have = new Set<string>((stored.requirements || []).map((r: any) => String(r.skillKey)));
  const derived = buildStageRequirements().requirements as any[];
  const missing = derived.filter(r => !have.has(String(r.skillKey)));

  console.log(`stage set "${BUILD_STAGE}" for tenant ${tenantId}`);
  console.log(`  already holds      : ${have.size} skills (${(stored.requirements || []).filter((r: any) => r.active !== false).length} active)`);
  console.log(`  derived set holds  : ${derived.length}`);
  console.log(`  to add             : ${missing.length}\n`);

  if (!missing.length) {
    console.log('Nothing missing. Left alone.');
    await mongoose.disconnect();
    return;
  }

  /* Appended after everything the tenant already has, so their ordering is untouched. */
  const lastOrder = Math.max(0, ...(stored.requirements || []).map((r: any) => Number(r.displayOrder) || 0));
  const additions = missing.map((r, i) => ({
    skillKey: String(r.skillKey),
    importance: 'SUPPORTING',
    weight: r.weight,
    targetLevel: r.targetLevel,
    active: true,
    displayOrder: lastOrder + (i + 1) * 10,
    note: 'Earlier-year prerequisite — measurable so the bridge can see a gap.',
  }));

  for (const a of additions) console.log(`  + ${a.skillKey.padEnd(26)} ${a.importance} / ${a.targetLevel}`);

  if (!apply) {
    console.log('\nDRY RUN — nothing written. Add --apply to save.');
    await mongoose.disconnect();
    return;
  }

  const res = await col.updateOne(
    { _id: stored._id },
    { $push: { requirements: { $each: additions } }, $set: { updatedAt: new Date() } },
  );
  console.log(`\nAdded ${additions.length}. Matched ${res.matchedCount}, modified ${res.modifiedCount}. Nothing was removed or deactivated.`);
  await mongoose.disconnect();
})().catch(e => { console.error(e?.message || e); process.exit(1); });
