/**
 * Empty a development tenant's question bank.
 *
 * FOR A DEVELOPMENT DATABASE, and it refuses to run anywhere that does not look local. This
 * deletes content outright — there is no deactivation to reverse, because a question bank is
 * authored material rather than derived state, and pretending otherwise would leave rows nobody
 * could see and nobody could clean up.
 *
 * WHAT GOES WITH THEM. A question is referenced by its skill mapping, and a mapping pointing at
 * a question that no longer exists is worse than no mapping at all: the generator counts it as
 * available, builds a paper around it, and then finds nothing — a shortfall that names a skill
 * with "plenty of questions". So mappings go in the same breath.
 *
 * WHAT SURVIVES. Student evidence and skill profiles. Those record what a student demonstrated,
 * not what was asked, and deleting somebody's measured history because the question was retired
 * would rewrite the past. They reference items by id and tolerate the item being gone.
 *
 * THE ASSESSMENT WILL REFUSE UNTIL NEW QUESTIONS EXIST. That is correct behaviour, not a
 * regression — the refusal message says the bank is still being filled, which will be true.
 *
 *   npx ts-node src/scripts/purgeQuestions.ts <tenantId>                    # dry run, everything
 *   npx ts-node src/scripts/purgeQuestions.ts <tenantId> --apply
 *   npx ts-node src/scripts/purgeQuestions.ts <tenantId> --scope=inactive --apply
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import SkillEvidence from '../models/SkillEvidence';
import StudentSkillEvidence from '../models/StudentSkillEvidence';
import StudentSkillProfile from '../models/StudentSkillProfile';

dotenv.config();

const looksLocal = (uri: string): boolean =>
  /localhost|127\.0\.0\.1|host\.docker\.internal/.test(uri);

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  const scopeArg = process.argv.find(a => a.startsWith('--scope='));
  /**
   * `all` empties the bank. `inactive` keeps whatever is still mapped to an active skill,
   * which is the safer half of the same job — useful when the goal is to clear out content for
   * skills that were switched off rather than to start over.
   */
  const scope = (scopeArg ? scopeArg.split('=')[1] : 'all') as 'all' | 'inactive';
  const force = process.argv.includes('--i-know-this-is-not-local');

  if (!tenantId) {
    console.error('Usage: purgeQuestions.ts <tenantId> [--scope=all|inactive] [--apply]');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || '';
  if (!looksLocal(uri) && !force) {
    console.error('REFUSED — this database does not look local:');
    console.error('  ' + uri.replace(/:\/\/[^@]*@/, '://***@'));
    console.error('\nThis DELETES questions. There is no undo. If you genuinely mean to run it');
    console.error('here, pass --i-know-this-is-not-local.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection;

  const mappingFilter: any = { tenantId, sourceType: 'question' };
  if (scope === 'inactive') mappingFilter.active = false;

  const mappings = await SkillEvidence.find(mappingFilter).select('sourceId').lean() as any[];
  const questionIds = [...new Set(mappings.map(m => String(m.sourceId)))]
    .filter(id => mongoose.Types.ObjectId.isValid(id))
    .map(id => new mongoose.Types.ObjectId(id));

  const questionCount = scope === 'all'
    ? await db.collection('questions').countDocuments({ tenantId })
    : await db.collection('questions').countDocuments({ _id: { $in: questionIds } });

  // What is kept, and why — so the report answers "what will still work afterwards".
  const evidenceRows = await StudentSkillEvidence.countDocuments({ tenantId });
  const profileRows = await StudentSkillProfile.countDocuments({ tenantId });
  const remainingMappings = await SkillEvidence.countDocuments({
    tenantId, ...(scope === 'inactive' ? { active: true } : {}),
  }) - (scope === 'inactive' ? 0 : mappings.length);

  console.log(`\nscope: ${scope}`);
  console.log(`  questions to DELETE      : ${questionCount}`);
  console.log(`  skill mappings to DELETE : ${mappings.length}`);
  console.log(`  mappings left afterwards : ${Math.max(0, remainingMappings)}`);
  console.log(`\n  kept — student history is never rewritten:`);
  console.log(`    student evidence rows  : ${evidenceRows}`);
  console.log(`    skill profile rows     : ${profileRows}`);

  if (scope === 'all') {
    console.log('\n  AFTER THIS, NO ASSESSMENT CAN BE GENERATED for this tenant until questions');
    console.log('  are loaded again. A student will be told the bank is still being filled,');
    console.log('  which will be true. Reload with:');
    console.log(`    npx ts-node src/scripts/importQuestionBank.ts ${tenantId} --apply`);
  }

  if (!apply) {
    console.log('\nDRY RUN — nothing deleted. Pass --apply to delete.');
    await mongoose.disconnect();
    return;
  }

  /**
   * Mappings first.
   *
   * If this is interrupted halfway, questions with no mapping are invisible to the generator and
   * harmless; mappings with no question are counted as available and produce a paper that cannot
   * be filled. Deleting in this order means the failure mode of a crash is the survivable one.
   */
  const m1 = await SkillEvidence.deleteMany(mappingFilter);
  const q1 = scope === 'all'
    ? await db.collection('questions').deleteMany({ tenantId })
    : await db.collection('questions').deleteMany({ _id: { $in: questionIds } });

  console.log(`\n✅ deleted ${m1.deletedCount} mappings and ${q1.deletedCount} questions.`);
  console.log('   Student evidence and skill profiles are untouched.');
  await mongoose.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
