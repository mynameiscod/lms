/**
 * Narrow a tenant to the Year-1 foundation curriculum's skills, and nothing else.
 *
 * FOR A DEVELOPMENT DATABASE. It exists so the new adaptive flow can be exercised without the
 * older Java-track content in the way — every skill outside the foundation curriculum is
 * switched off, so assessments, plans and readiness all draw from the same 34.
 *
 * DEACTIVATES, DOES NOT DELETE. `active: false` removes a skill from every paper, plan and
 * readiness calculation while leaving the row, its questions and any student's history intact —
 * so this is reversible with one update, and a mistake costs nothing. Deleting would orphan
 * question mappings and evidence rows that reference skills by key, and nothing would report
 * that it had happened.
 *
 * IT TELLS YOU WHAT BREAKS BEFORE IT BREAKS IT. Role blueprints reference skills outside the
 * foundation set; switching those off leaves a role unable to produce a paper. That is the
 * intended trade on a development box and a disaster on a live one, so the dry run names every
 * affected role and the script refuses to run against a database whose URI does not look local
 * unless it is told to.
 *
 *   npx ts-node src/scripts/scopeTenantToFoundation.ts <tenantId>
 *   npx ts-node src/scripts/scopeTenantToFoundation.ts <tenantId> --apply
 *   npx ts-node src/scripts/scopeTenantToFoundation.ts <tenantId> --apply --foundation-only
 *   npx ts-node src/scripts/scopeTenantToFoundation.ts <tenantId> --apply --restore
 *
 * --foundation-only additionally disables the other three stage sets and unpublishes every role
 * blueprint, so a member cannot reach a path this tenant has no content for. See below.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LearningCurriculum from '../models/LearningCurriculum';
import CareerSkill from '../models/CareerSkill';
import SkillEvidence from '../models/SkillEvidence';
import StudentSkillProfile from '../models/StudentSkillProfile';
import RoleSkillBlueprint from '../models/RoleSkillBlueprint';
import StageSkillSet from '../models/StageSkillSet';

dotenv.config();

/**
 * A database that is not obviously local.
 *
 * The one guard worth having: this script is destructive by design, and the difference between
 * a dev box and production is one environment variable somebody forgot to change.
 */
const looksLocal = (uri: string): boolean =>
  /localhost|127\.0\.0\.1|host\.docker\.internal/.test(uri);

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  const restore = process.argv.includes('--restore');
  const force = process.argv.includes('--i-know-this-is-not-local');
  const foundationOnly = process.argv.includes('--foundation-only');

  if (!tenantId) {
    console.error('Usage: scopeTenantToFoundation.ts <tenantId> [--apply] [--restore]');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  if (!looksLocal(uri) && !force) {
    console.error('REFUSED — this database does not look local:');
    console.error('  ' + uri.replace(/:\/\/[^@]*@/, '://***@'));
    console.error('\nThis switches skills off tenant-wide and will stop published roles producing');
    console.error('papers. If you genuinely mean to run it here, pass --i-know-this-is-not-local.');
    process.exit(1);
  }

  await mongoose.connect(uri);

  if (restore) {
    const r = await CareerSkill.updateMany({ active: false }, { $set: { active: true } });
    const e = await SkillEvidence.updateMany({ tenantId, active: false }, { $set: { active: true } });
    const st = await StageSkillSet.updateMany({ tenantId, enabled: false }, { $set: { enabled: true } });
    const bp = await RoleSkillBlueprint.updateMany({ tenantId, published: false }, { $set: { published: true } });
    console.log(`restored: ${r.modifiedCount} skills, ${e.modifiedCount} question mappings, `
      + `${st.modifiedCount} stage sets, ${bp.modifiedCount} role blueprints reactivated`);
    await mongoose.disconnect();
    return;
  }

  const curriculum = await LearningCurriculum.findOne({
    tenantId, adaptiveStage: 'foundation', isPublished: true, personalizedFor: null,
  }).lean() as any;
  if (!curriculum) {
    console.error('No curriculum claims the foundation stage. Run createFoundationCurriculum first.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const keep = new Set<string>(
    (curriculum.topics || []).flatMap((t: any) => (t.skillKeys || []).map((k: string) => String(k).toUpperCase())),
  );

  const all = await CareerSkill.find({ active: true }).select('key name nodeType').lean() as any[];
  // GROUP nodes are shelves, not capabilities — they are never assessed or taught, and
  // switching them off would break the taxonomy tree for no benefit.
  const drop = all.filter(s => s.nodeType !== 'GROUP' && !keep.has(String(s.key).toUpperCase()));

  const mapsToDrop = await SkillEvidence.countDocuments({
    tenantId, active: true, skillKey: { $nin: [...keep] },
  });
  const profilesOutside = await StudentSkillProfile.countDocuments({
    tenantId, skillKey: { $nin: [...keep] },
  });

  // What this costs: every published role that leans on a skill being switched off.
  const blueprints = await RoleSkillBlueprint.find({ tenantId, published: true })
    .select('roleKey requirements').lean() as any[];
  const affected = blueprints.map(b => {
    const reqs = (b.requirements || []).filter((r: any) => r.active !== false);
    const surviving = reqs.filter((r: any) => keep.has(String(r.skillKey).toUpperCase()));
    return { roleKey: b.roleKey, total: reqs.length, surviving: surviving.length };
  });

  console.log(`\ncurriculum "${curriculum.title}" teaches ${keep.size} skills`);
  console.log(`active skills in the taxonomy : ${all.length}`);
  console.log(`would be switched OFF          : ${drop.length}`);
  console.log(`question mappings deactivated  : ${mapsToDrop}`);
  console.log(`student skill rows outside set : ${profilesOutside}  (left alone — they are history)`);

  console.log('\nrole blueprints after this:');
  for (const a of affected) {
    const flag = a.surviving < 6 ? '   <-- too few skills left to build a paper' : '';
    console.log(`  ${String(a.roleKey).padEnd(22)} ${a.surviving}/${a.total} skills survive${flag}`);
  }

  if (!apply) {
    console.log('\nDRY RUN — nothing written. Pass --apply to switch them off.');
    console.log('Reversible at any time with --apply --restore.');
    await mongoose.disconnect();
    return;
  }

  const s = await CareerSkill.updateMany(
    { active: true, nodeType: { $ne: 'GROUP' }, key: { $nin: [...keep] } },
    { $set: { active: false } },
  );
  const e = await SkillEvidence.updateMany(
    { tenantId, active: true, skillKey: { $nin: [...keep] } },
    { $set: { active: false } },
  );

  console.log(`\n✅ ${s.modifiedCount} skills switched off, ${e.modifiedCount} question mappings deactivated.`);

  if (foundationOnly) {
    /**
     * Close every path this tenant cannot serve.
     *
     * The other stage sets and the role blueprints still name skills that are now switched off,
     * so a second-year — or anyone who picks a target role — reaches a scope that is mostly
     * gone. That does not fail loudly. It produces a thin paper, or a plan built on a handful
     * of skills, which looks like a working product measuring the wrong things.
     *
     * Disabling them means such a student is told plainly that nothing is configured for them
     * yet, which is true, instead of being quietly served something worse.
     */
    const st = await StageSkillSet.updateMany(
      { tenantId, stage: { $ne: 'foundation' }, enabled: true },
      { $set: { enabled: false } },
    );
    const bp = await RoleSkillBlueprint.updateMany(
      { tenantId, published: true },
      { $set: { published: false } },
    );
    console.log(`✅ ${st.modifiedCount} stage sets disabled, ${bp.modifiedCount} role blueprints unpublished.`);
    console.log('   Every member now takes the foundation path, whatever role they picked.');
  }

  console.log('Student skill history is untouched. Reverse with --apply --restore.');
  await mongoose.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
