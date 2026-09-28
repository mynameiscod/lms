/**
 * Give every seeded unit the authorship its stage map actually declares.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx ts-node src/scripts/reconcileUnitAuthorship.ts <tenantId>
 *   npx ts-node src/scripts/reconcileUnitAuthorship.ts <tenantId> --apply
 *   npx ts-node src/scripts/reconcileUnitAuthorship.ts <tenantId> --stage build --apply
 *
 * ── WHY THIS EXISTS AND WHY RE-SEEDING WOULD NOT DO IT ────────────────────────────────────
 *
 * seedStageCurriculum writes a unit's AUTHORSHIP — category, depth, directions, mandatory and
 * status — in `$setOnInsert`, because an admin who changes one keeps their change. That is the
 * right rule and it has a consequence: when the seeder itself resolved a field from the wrong
 * place, every row already in the database stays wrong however many times it is re-seeded.
 *
 * It resolved two fields from the wrong place. Both lived on the STAGE MAP's topic and were read
 * from the UNIT DATASET's topic, which carries `{ category, units }` and nothing else:
 *
 *   DEPTH. Every unit of Years 2, 3 and 4 was written 'STANDARD'. compositionRoleOf reads depth
 *   to separate FOUNDATION_INSTRUCTION and GUIDED_INSTRUCTION from ADVANCED_UNIVERSAL, so those
 *   two buckets were empty in all three years and a learner with nothing proven composed a plan
 *   violating five role minimums. unitSuitabilityPolicy reads depth too.
 *
 *   DIRECTIONS. The seeder gained a stage-map fallback for these when Year 3 was built, and the
 *   comment there describes the failure exactly: `appliesToDirection` treats an empty list as
 *   "everyone", so every unit of every track composes into every student's plan and nothing
 *   errors. Year 2 was seeded before that fallback existed and still carries 84 direction units
 *   with no direction on them — a student who chose Backend is being given the Mobile, Data,
 *   AI/ML, Cloud, Security and Frontend tracks as well.
 *
 * ── THE ONE THING TO KNOW BEFORE RUNNING IT WITH --apply ──────────────────────────────────
 *
 * This CANNOT distinguish a row still carrying the seeder's wrong value from a row an admin
 * deliberately set to the same value. It therefore prints every change it intends to make,
 * grouped by topic, and writes nothing without --apply. On a tenant where an admin has hand-tuned
 * unit depth or direction scoping, read the dry run before trusting it.
 *
 * It only ever moves a unit to what its stage map declares, so running it twice is a no-op and
 * running it after a re-seed is also a no-op. It never publishes, unpublishes or archives.
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

/** Every stage whose map declares topic authorship, keyed the way the units are stored. */
const STAGES: Record<string, FoundationModuleSeed[]> = {
  foundation: FOUNDATION_MODULES,
  [BUILD_STAGE_KEY]: BUILD_MODULES,
  [SPECIALIZE_STAGE_KEY]: SPECIALIZE_MODULES,
  [PLACEMENT_STAGE_KEY]: PLACEMENT_MODULES,
};

const sameList = (a: string[], b: string[]): boolean =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

async function run(): Promise<void> {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  const only = process.argv.includes('--stage')
    ? process.argv[process.argv.indexOf('--stage') + 1]
    : null;

  if (!tenantId) {
    console.error('Usage: reconcileUnitAuthorship.ts <tenantId> [--stage <key>] [--apply]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  console.log(`\nUNIT AUTHORSHIP RECONCILIATION  ·  tenant ${tenantId}`);
  console.log(apply ? '\nAPPLYING\n' : '\nDRY RUN — pass --apply to write\n');

  let totalChanged = 0;
  let totalChecked = 0;

  for (const [stageKey, modules] of Object.entries(STAGES)) {
    if (only && only !== stageKey) continue;

    /* What the author declared, by topic. A topic that declares nothing is left alone. */
    const depth = new Map<string, string>();
    const directions = new Map<string, string[]>();
    for (const mod of modules) {
      for (const t of mod.topics) {
        const d = (t as any).defaultDepth;
        if (d) depth.set(t.topicCode, String(d));
        const dirs = (t as any).applicableDirections;
        if (Array.isArray(dirs) && dirs.length) directions.set(t.topicCode, dirs.map(String));
      }
    }

    const units = await CurriculumLearningUnit
      .find({ tenantId, stageKey })
      .select('unitCode topicCode defaultDepth applicableDirections')
      .lean() as any[];
    if (!units.length) continue;
    totalChecked += units.length;

    /*
     * Grouped by topic rather than listed per unit: a topic's units all move together, and
     * ninety lines of "this one too" hides the one topic that was not supposed to.
     */
    const moves = new Map<string, number>();
    const ops: any[] = [];
    for (const u of units) {
      const set: any = {};
      const notes: string[] = [];

      const wantDepth = depth.get(String(u.topicCode));
      if (wantDepth && wantDepth !== String(u.defaultDepth || '')) {
        set.defaultDepth = wantDepth;
        notes.push(`depth ${u.defaultDepth || '(unset)'} -> ${wantDepth}`);
      }

      const wantDirs = directions.get(String(u.topicCode));
      const haveDirs = (u.applicableDirections || []).map(String);
      if (wantDirs && !sameList(haveDirs, wantDirs)) {
        set.applicableDirections = wantDirs;
        notes.push(`directions [${haveDirs.join(',') || 'EVERYONE'}] -> [${wantDirs.join(',')}]`);
      }

      if (!notes.length) continue;
      const key = `${u.topicCode}  ${notes.join('; ')}`;
      moves.set(key, (moves.get(key) || 0) + 1);
      ops.push({
        updateOne: {
          filter: { _id: u._id },
          update: { $set: { ...set, updatedBy: 'unit-authorship-reconcile' } },
        },
      });
    }

    console.log(`  ${stageKey}  —  ${units.length} units, ${ops.length} to change`);
    for (const [key, n] of [...moves.entries()].sort()) {
      console.log(`      ${String(n).padStart(3)}  ${key}`);
    }
    if (!moves.size) console.log('      already correct');
    console.log('');

    totalChanged += ops.length;
    if (apply && ops.length) await CurriculumLearningUnit.bulkWrite(ops, { ordered: false });
  }

  console.log(apply
    ? `WRITTEN. ${totalChanged} of ${totalChecked} units moved to what their stage map declares.`
    : `${totalChanged} of ${totalChecked} units would change. Re-run with --apply.`);
  console.log('Nothing is published, unpublished or archived by this script.\n');

  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('\nFAILED:', e?.message || e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
