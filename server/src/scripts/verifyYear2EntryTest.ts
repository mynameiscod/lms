/**
 * Can a Year-2 entry paper actually be built from what has been seeded?
 *
 * READ ONLY. Nothing is written, no student is touched, no evidence is recorded. It resolves the
 * 'build' stage exactly as a student's first assessment would, builds the paper through the same
 * function the student start and the admin preview both use, and reports what came out.
 *
 *   npx ts-node src/scripts/verifyYear2EntryTest.ts <tenantId>
 *
 * WHY THIS EXISTS RATHER THAN A TEST. The question is not whether the code works — unit tests
 * cover that. It is whether THIS TENANT'S DATA can answer it: whether the questions seeded with
 * the Year-2 content are enough, per skill, at the difficulty the build policy asks for. That is
 * a fact about a database, and it changes every time content is authored or published.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { buildPersonalizedAssessment } from '../services/personalizedAssessmentService';
import { getStageBlueprint } from '../services/stageSkillSetService';
import { policyForStage } from '../data/assessmentPolicies';
import { BUILD_STAGE } from '../seeds/careerPilot/year2StageSkillSet';

dotenv.config();

(async () => {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error('Usage: verifyYear2EntryTest.ts <tenantId> [studentId] [--papers N]');
    process.exit(1);
  }

  /**
   * The draw is seeded on the student id, so one id shows one paper and tells you nothing about
   * the other thirty. The stage set holds 31 skills and a paper asks about 8, which means a
   * skill can be perfectly well stocked and still be absent from any particular student's test.
   * --papers walks a run of synthetic ids and reports which skills were reachable across them,
   * which is the question worth asking after an import.
   */
  const argStudent = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : null;
  const papersFlag = process.argv.indexOf('--papers');
  const papers = papersFlag > -1 ? Math.max(1, Number(process.argv[papersFlag + 1]) || 1) : 1;

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const policy = policyForStage(BUILD_STAGE);
  console.log(`\nYEAR-2 ENTRY TEST  ·  tenant ${tenantId}`);
  console.log(`  policy        : ${policy.key} v${policy.version}`);
  console.log(`  asks for      : ${policy.skillSlots} questions, `
    + `${policy.minItemsPerSkill}-${policy.maxItemsPerSkill} per skill, max ${policy.maxSkills} skills`);
  console.log(`  difficulty    : ${JSON.stringify(policy.difficultyMix)}`);

  /* The same resolution a student's first Year-2 assessment performs. */
  const blueprint = await getStageBlueprint(tenantId, BUILD_STAGE);
  if (!blueprint) {
    console.error(`\nREFUSED: no usable '${BUILD_STAGE}' stage skill set for this tenant.`);
    console.error('  A set that exists but is switched off does not resolve. Enable it with:');
    console.error(`  npx ts-node src/seeds/careerPilot/seedFoundationStageSkillSet.ts ${tenantId} --apply --enable --year2`);
    await mongoose.disconnect();
    process.exit(1);
  }

  /* Only the active requirements: an inactive row is written for an admin to see, not to ask about. */
  const skillKeys: string[] = (blueprint.requirements || [])
    .filter((r: any) => r.active !== false)
    .map((r: any) => String(r.skillKey));
  console.log(`  stage set     : ${skillKeys.length} active skill(s) of ${(blueprint.requirements || []).length}`);

  /* Student ids that belong to nobody: these only seed the draw, and nothing is written. */
  const studentIds = argStudent
    ? [argStudent]
    : Array.from({ length: papers }, (_, n) => String(n + 1).padStart(24, '0'));

  /**
   * The stage path's own two adjustments, which this script used to omit — and so measured a
   * paper no student would ever sit.
   *
   * resolveBlueprint returns `{ ...policy, prerequisiteDepth: 0 }` and a skillPriority built
   * from the set's importance, weight and displayOrder. Leaving both out let the default depth
   * of 1 walk back into prerequisites, and `preferFoundationalSkills` then sorts every
   * prerequisite ahead of every stage skill — so the paper came out made entirely of skills
   * that are not in the stage set at all (DB_FUNDAMENTALS, GIT_FUNDAMENTALS, SQL_BASICS),
   * while the set's own 31 were pushed out of all eight slots.
   *
   * A verification script that does not reproduce the path it claims to verify is worse than
   * no script, because its output looks like evidence.
   */
  const stagePolicy = { ...policy, prerequisiteDepth: 0 };
  const skillPriority = new Map(
    (blueprint.requirements || []).map((r: any) => [String(r.skillKey), {
      importance: r.importance, weight: r.weight, order: r.displayOrder,
    }]),
  );

  const buildFor = (studentId: string) => buildPersonalizedAssessment({
    tenantId,
    studentId,
    stage: BUILD_STAGE,
    roleKey: (blueprint as any).roleKey || BUILD_STAGE,
    roleSkillKeys: skillKeys,
    skillPriority,
    policy: stagePolicy,
    blueprintVersion: Number((blueprint as any).version || 1),
    attemptNumber: 1,
  } as any);

  /* ---- several papers: report coverage across them rather than one paper in detail ------- */
  if (studentIds.length > 1) {
    const reached = new Map<string, number>();
    const difficulty = new Map<string, number>();
    let failures = 0;
    for (const sid of studentIds) {
      const b = await buildFor(sid);
      if (!b.ok) { failures++; continue; }
      for (const i of (b.items || []) as any[]) {
        reached.set(i.skillKey, (reached.get(i.skillKey) || 0) + 1);
        const d = String(i.servedDifficulty || i.difficulty || 'UNTAGGED');
        difficulty.set(d, (difficulty.get(d) || 0) + 1);
      }
    }
    console.log(`\n  ${studentIds.length} papers built${failures ? `, ${failures} refused` : ''}`);
    console.log(`  difficulty served : ${[...difficulty.entries()].map(([d, n]) => `${d}=${n}`).join('  ')}`);
    console.log(`\n  skills reached (${reached.size} of ${skillKeys.length}), questions asked across all papers:`);
    for (const [k, n] of [...reached.entries()].sort((a, b) => b[1] - a[1])) {
      console.log(`    ${k.padEnd(30)} ${n}`);
    }
    const never = skillKeys.filter(k => !reached.has(k)).sort();
    if (never.length) {
      console.log(`\n  never reached in ${studentIds.length} papers (${never.length}):`);
      for (const k of never) console.log(`    ${k}`);
    }
    console.log('\n  Nothing was written.\n');
    await mongoose.disconnect();
    return;
  }

  const built = await buildFor(studentIds[0]);

  if (!built.ok) {
    console.error(`\nCOULD NOT BUILD: ${built.reasonCode || ''} ${built.adminMessage || built.message || ''}`);
    if (built.notMeasuredSkills?.length) {
      console.error(`\n  Skills with too little evidence (${built.notMeasuredSkills.length}):`);
      for (const s of built.notMeasuredSkills.slice(0, 20)) {
        console.error(`    ${String((s as any).skillKey).padEnd(28)} ${JSON.stringify(s)}`);
      }
    }
    await mongoose.disconnect();
    process.exit(1);
  }

  const items = built.items || [];
  const perSkill = new Map<string, number>();
  const perDifficulty = new Map<string, number>();
  for (const i of items as any[]) {
    perSkill.set(i.skillKey, (perSkill.get(i.skillKey) || 0) + 1);
    const d = String(i.servedDifficulty || i.difficulty || 'UNTAGGED');
    perDifficulty.set(d, (perDifficulty.get(d) || 0) + 1);
  }

  console.log(`\n  BUILT: ${items.length} question(s) over ${perSkill.size} skill(s)`);
  console.log(`  difficulty served : ${[...perDifficulty.entries()].map(([d, n]) => `${d}=${n}`).join('  ')}`);
  console.log('\n  per skill:');
  for (const [k, n] of [...perSkill.entries()].sort()) console.log(`    ${k.padEnd(30)} ${n}`);

  if (built.notMeasuredSkills?.length) {
    console.log(`\n  NOT MEASURED — ${built.notMeasuredSkills.length} stage skill(s) had too little evidence:`);
    for (const s of built.notMeasuredSkills.slice(0, 25)) {
      console.log(`    ${String((s as any).skillKey || '').padEnd(30)} ${(s as any).distinctPrimary ?? '?'} distinct primary item(s)`);
    }
    console.log('\n  These are not a failure: the paper measures what it can and says what it cannot.');
  }

  console.log('\n  Nothing was written.\n');
  await mongoose.disconnect();
})().catch(async (e) => {
  console.error('\nFAILED:', e?.message || e);
  await mongoose.disconnect();
  process.exit(1);
});
