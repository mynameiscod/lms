/**
 * Move a stage, or a named student, onto the UNIT curriculum engine.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx ts-node src/scripts/setCurriculumEngineStages.ts <tenantId>                       # show
 *   npx ts-node src/scripts/setCurriculumEngineStages.ts <tenantId> --students <id,id>    # pilot
 *   npx ts-node src/scripts/setCurriculumEngineStages.ts <tenantId> --stages build,specialize
 *   ... add --apply to write.
 *
 * In production, against the compiled build:
 *   docker exec lms-server-<slot> node dist/scripts/setCurriculumEngineStages.js <tenantId> --stages build
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────────
 *
 * `foundation` is on the unit engine unconditionally — that is the product. Every other stage
 * reaches it only where a tenant opts in, and the opt-in lives on three PassportConfig fields
 * that NO ADMIN SCREEN RENDERS. So a deployment carrying a full four-year curriculum still
 * serves Years 2, 3 and 4 the old topic roadmap, and there is no way to change that from the
 * product. This is that way.
 *
 * ── IT REFUSES A STAGE THAT CANNOT SERVE THE STUDENTS IT WOULD MOVE ───────────────────────
 *
 * Switching a stage on does not create content for it. A stage with fewer published units than
 * its programme has days moves its students from a WRONG roadmap to NO roadmap — "your
 * curriculum has not been set up" — which is more honest and no more useful. The readiness check
 * runs first, per stage, and a short stage is refused by name.
 *
 * `--force` overrides that, and is for the one case it is right: a stage being switched on ahead
 * of a content deploy that is already staged, by somebody who knows the order they are doing it
 * in. It prints what it is overriding.
 *
 * ── WHY IT WILL NOT SET THE TENANT SWITCH ─────────────────────────────────────────────────
 *
 * `megaCurriculumEnabled` moves EVERY stage at once, including any with no content and any added
 * later. The stage list says what was decided, one stage at a time, and reads back as the
 * decision it was. There is no flag here that sets the tenant switch; a tenant that genuinely
 * wants it can be given it by hand, deliberately, by somebody who has read this paragraph.
 *
 * ── ADDITIVE ──────────────────────────────────────────────────────────────────────────────
 *
 * Stages and ids are merged into what is already there, never replaced, so a second run for
 * Year 3 cannot silently take Year 2 back off. `--remove` takes stages off again.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import PassportConfig from '../models/PassportConfig';
import { foundationReadiness } from '../services/foundationReadinessService';
import {
  effectiveCurriculumEngine, unitEngineServesStage, UNIT_ENGINE_STAGES,
} from '../data/curriculumEnginePolicy';

const listArg = (flag: string): string[] => {
  const i = process.argv.indexOf(flag);
  if (i < 0) return [];
  return String(process.argv[i + 1] || '')
    .split(',').map(s => s.trim()).filter(Boolean);
};

async function run(): Promise<void> {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  const force = process.argv.includes('--force');
  const remove = process.argv.includes('--remove');
  const stages = listArg('--stages').map(s => s.toLowerCase());
  const students = listArg('--students');

  if (!tenantId) {
    console.error('Usage: setCurriculumEngineStages.ts <tenantId> [--stages a,b] [--students id,id] [--remove] [--apply] [--force]');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) { console.error('MONGODB_URI is not set'); process.exit(1); }
  await mongoose.connect(uri);

  console.log(`\nCURRICULUM ENGINE  ·  tenant ${tenantId}`);
  console.log(apply ? '\nAPPLYING\n' : '\nDRY RUN — pass --apply to write\n');

  const cfg = await PassportConfig.findOne({ tenantId })
    .select('megaCurriculumEnabled megaCurriculumStages megaCurriculumStudentIds').lean() as any;
  if (!cfg) {
    console.error('  This tenant has no PassportConfig. CareerPilot has not been set up here at all;');
    console.error('  creating one is a product decision, not a switch, so nothing was written.');
    await mongoose.disconnect();
    process.exit(1);
  }

  const haveStages: string[] = (cfg.megaCurriculumStages || []).map(String);
  const haveIds: string[] = (cfg.megaCurriculumStudentIds || []).map(String);
  console.log('  now:');
  console.log(`    megaCurriculumEnabled     ${cfg.megaCurriculumEnabled === true}`);
  console.log(`    megaCurriculumStages      [${haveStages.join(', ') || '(empty)'}]`);
  console.log(`    megaCurriculumStudentIds  ${haveIds.length} id(s)`);
  console.log('');

  if (!stages.length && !students.length) {
    console.log('  Nothing asked for. Pass --stages and/or --students.\n');
    console.log(`  Stages the unit engine can serve: ${UNIT_ENGINE_STAGES.join(', ')}\n`);
    await mongoose.disconnect();
    return;
  }

  /* ── The stages, checked before they are accepted ─────────────────────────────────────── */

  const accepted: string[] = [];
  for (const stage of stages) {
    if (!unitEngineServesStage(stage)) {
      console.log(`  ${stage.padEnd(12)} REFUSED — the unit engine cannot plan this stage.`);
      continue;
    }
    if (remove) { accepted.push(stage); continue; }

    const r = await foundationReadiness(tenantId, stage);
    if (r.configured) {
      console.log(`  ${stage.padEnd(12)} ready — ${r.publishedUnits} published units.`);
      accepted.push(stage);
    } else if (force) {
      console.log(`  ${stage.padEnd(12)} NOT READY, FORCED — ${r.message}`);
      accepted.push(stage);
    } else {
      console.log(`  ${stage.padEnd(12)} REFUSED — ${r.message}`);
      console.log(`  ${''.padEnd(12)}   Switching this on would move these students from a wrong`);
      console.log(`  ${''.padEnd(12)}   roadmap to no roadmap. Deploy the content first, or --force.`);
    }
  }
  console.log('');

  /* ── The write ────────────────────────────────────────────────────────────────────────── */

  const nextStages = remove
    ? haveStages.filter(s => !accepted.includes(s))
    : [...new Set([...haveStages, ...accepted])];
  const nextIds = remove
    ? haveIds.filter(id => !students.includes(id))
    : [...new Set([...haveIds, ...students])];

  const stagesChanged = nextStages.join('|') !== haveStages.join('|');
  const idsChanged = nextIds.join('|') !== haveIds.join('|');

  if (!stagesChanged && !idsChanged) {
    console.log('  Nothing to change.\n');
    await mongoose.disconnect();
    return;
  }

  console.log('  would write:');
  if (stagesChanged) console.log(`    megaCurriculumStages      [${nextStages.join(', ') || '(empty)'}]`);
  if (idsChanged)    console.log(`    megaCurriculumStudentIds  ${nextIds.length} id(s)`);
  console.log('');

  if (apply) {
    await PassportConfig.updateOne({ tenantId }, {
      $set: {
        ...(stagesChanged ? { megaCurriculumStages: nextStages } : {}),
        ...(idsChanged ? { megaCurriculumStudentIds: nextIds } : {}),
      },
    });
    console.log('  WRITTEN.\n');
  }

  /* ── What a student on each stage will now be served ──────────────────────────────────── */

  const after = { ...cfg, megaCurriculumStages: nextStages, megaCurriculumStudentIds: nextIds };
  console.log(`  ${apply ? 'Now' : 'Would be'}, for a student not named in the id list:`);
  for (const stage of UNIT_ENGINE_STAGES) {
    const e = effectiveCurriculumEngine({ config: after, studentId: null, stageKey: stage });
    console.log(`    ${stage.padEnd(12)} ${e.engine === 'UNIT' ? 'UNIT ' : 'TOPIC'}   basis=${e.basis}`);
  }

  console.log('\n  Existing journeys are NOT rewritten by this. A student already carrying a topic');
  console.log('  roadmap keeps it until something triggers a recomposition; a student with no');
  console.log('  journey gets a unit one at their next trigger.\n');

  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('\nFAILED:', e?.message || e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
