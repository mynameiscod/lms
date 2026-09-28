/**
 * Give every seeded unit the depth its stage map actually declares.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx ts-node src/scripts/reconcileUnitDepth.ts <tenantId>
 *   npx ts-node src/scripts/reconcileUnitDepth.ts <tenantId> --apply
 *   npx ts-node src/scripts/reconcileUnitDepth.ts <tenantId> --stage placement --apply
 *
 * ── WHY THIS EXISTS AND WHY RE-SEEDING WOULD NOT DO IT ────────────────────────────────────
 *
 * seedStageCurriculum resolved a unit's `defaultDepth` from the UNIT DATASET's topic, and a
 * dataset topic carries `{ category, units }` and nothing else. The depth an author wrote lives
 * on the STAGE MAP's topic, so it was read as undefined and every unit of Years 2, 3 and 4 was
 * written 'STANDARD'. The seeder now falls back to the stage map — but `defaultDepth` is written
 * in `$setOnInsert`, because depth is authorship an admin is allowed to own, so a re-seed leaves
 * every row already in the database exactly as wrong as it was. Hence a separate, deliberate,
 * reversible pass.
 *
 * ── WHAT IT WAS COSTING ───────────────────────────────────────────────────────────────────
 *
 * `compositionRoleOf` reads depth to separate FOUNDATION_INSTRUCTION and GUIDED_INSTRUCTION from
 * ADVANCED_UNIVERSAL. With every unit at STANDARD those two buckets were empty in all three
 * years, so a learner with nothing proven composed a plan that violated five role minimums —
 * 102 units of advanced material against a target of 27, no foundation teaching, no guided
 * teaching, no integration, no verification. Year 4's ten-day bridge, authored at FOUNDATION and
 * GUIDED precisely so a fourth-year arriving without the fundamentals is taught rather than
 * revised, was indistinguishable from its advanced material and was never selected for the
 * learners it was written for.
 *
 * `unitSuitabilityPolicy` reads depth as well, so every suitability decision in every year was
 * being made against a depth nobody authored.
 *
 * ── THE ONE THING TO KNOW BEFORE RUNNING IT WITH --apply ──────────────────────────────────
 *
 * This CANNOT distinguish a row still carrying the seeder's wrong default from a row an admin
 * deliberately set to the same value. Both look like 'STANDARD'. It therefore prints every
 * change it intends to make, grouped by topic, and writes nothing without --apply. On a tenant
 * where an admin has hand-tuned unit depth, read the dry run before trusting it.
 *
 * It only ever moves a unit to the depth its stage map declares, so running it twice is a no-op
 * and running it after a re-seed is also a no-op.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import { FoundationModuleSeed } from '../seeds/careerPilot/foundationSkillMap';
import { FOUNDATION_MODULES } from '../seeds/careerPilot/foundationSkillMap';
import { BUILD_STAGE_KEY, BUILD_MODULES } from '../seeds/careerPilot/year2StageMap';
import { SPECIALIZE_STAGE_KEY, SPECIALIZE_MODULES } from '../seeds/careerPilot/year3StageMap';
import { PLACEMENT_STAGE_KEY, PLACEMENT_MODULES } from '../seeds/careerPilot/year4StageMap';

/** Every stage whose map declares topic depth, keyed the way the units are stored. */
const STAGES: Record<string, FoundationModuleSeed[]> = {
  foundation: FOUNDATION_MODULES,
  [BUILD_STAGE_KEY]: BUILD_MODULES,
  [SPECIALIZE_STAGE_KEY]: SPECIALIZE_MODULES,
  [PLACEMENT_STAGE_KEY]: PLACEMENT_MODULES,
};

async function run(): Promise<void> {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  const only = process.argv.includes('--stage')
    ? process.argv[process.argv.indexOf('--stage') + 1]
    : null;

  if (!tenantId) {
    console.error('Usage: reconcileUnitDepth.ts <tenantId> [--stage <key>] [--apply]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  console.log(`\nUNIT DEPTH RECONCILIATION  ·  tenant ${tenantId}`);
  console.log(apply ? '\nAPPLYING\n' : '\nDRY RUN — pass --apply to write\n');

  let totalChanged = 0;
  let totalChecked = 0;

  for (const [stageKey, modules] of Object.entries(STAGES)) {
    if (only && only !== stageKey) continue;

    /* The depth the author declared, by topic. A topic that declares none is left alone. */
    const declared = new Map<string, string>();
    for (const mod of modules) {
      for (const t of mod.topics) {
        const d = (t as any).defaultDepth;
        if (d) declared.set(t.topicCode, String(d));
      }
    }

    const units = await CurriculumLearningUnit
      .find({ tenantId, stageKey })
      .select('unitCode topicCode defaultDepth')
      .lean() as any[];
    if (!units.length) continue;
    totalChecked += units.length;

    /*
     * Grouped by topic rather than listed per unit: a topic's units all move together, and
     * ninety lines of "this one too" hides the one topic that was not supposed to.
     */
    const moves = new Map<string, { from: string; to: string; count: number }>();
    const ops: any[] = [];
    for (const u of units) {
      const want = declared.get(String(u.topicCode));
      const have = String(u.defaultDepth || '');
      if (!want || want === have) continue;
      const key = `${u.topicCode}|${have}|${want}`;
      const m = moves.get(key) || { from: have, to: want, count: 0 };
      m.count++;
      moves.set(key, m);
      ops.push({
        updateOne: {
          filter: { _id: u._id },
          update: { $set: { defaultDepth: want, updatedBy: 'unit-depth-reconcile' } },
        },
      });
    }

    console.log(`  ${stageKey}  —  ${units.length} units, ${ops.length} to change`);
    for (const [key, m] of [...moves.entries()].sort()) {
      const topic = key.split('|')[0];
      console.log(`      ${String(m.count).padStart(3)}  ${topic.padEnd(34)} ${m.from || '(unset)'} -> ${m.to}`);
    }
    if (!moves.size) console.log('      already correct');
    console.log('');

    totalChanged += ops.length;
    if (apply && ops.length) await CurriculumLearningUnit.bulkWrite(ops, { ordered: false });
  }

  console.log(apply
    ? `WRITTEN. ${totalChanged} of ${totalChecked} units moved to the depth their stage map declares.`
    : `${totalChanged} of ${totalChecked} units would change. Re-run with --apply.`);
  console.log('Nothing is published, unpublished or archived by this script.\n');

  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('\nFAILED:', e?.message || e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
