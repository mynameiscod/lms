/**
 * Roadmap V2 — move existing students' old (V1) roadmaps to V2, the same as the admin Rebuild
 * buttons (roadmapRebuildService).
 *
 *   node dist/migrations/roadmap-v2/rv2Rebuild.js <tenantId>                            dry run: who can be rebuilt, writes nothing
 *   node dist/migrations/roadmap-v2/rv2Rebuild.js <tenantId> --apply                    rebuild every V1 roadmap as V2
 *   node dist/migrations/roadmap-v2/rv2Rebuild.js <tenantId> --apply --stage=placement  one year only
 *   node dist/migrations/roadmap-v2/rv2Rebuild.js <tenantId> --apply --student=<userId> one student only
 *
 * A student who has not started gets a whole new roadmap; one who has keeps every completed day
 * and the day they are on, and the rest is rebuilt. Quiz results, XP and progress are not touched.
 * A student who cannot be rebuilt (no skill check yet, say) is listed with the reason and keeps
 * their roadmap. Safe to run again: only roadmaps still V1 are picked up.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LearningCurriculum from '../../models/LearningCurriculum';
import { FOUNDATION_JOURNEY_KIND } from '../../services/foundationJourneyService';
import { rebuildRoadmap } from '../../services/roadmapRebuildService';
dotenv.config();

const STAGES = ['foundation', 'build', 'specialize', 'placement'];

async function run(): Promise<void> {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  const arg = (k: string) => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1] || '';
  const stage = arg('stage');
  const student = arg('student');
  if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId) || (stage && !STAGES.includes(stage))
    || (student && !mongoose.Types.ObjectId.isValid(student))) {
    console.error('Usage: rv2Rebuild <tenantId> [--apply] [--stage=foundation|build|specialize|placement] [--student=<userId>]');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const list: { personalizedFor: any; adaptiveStage: string }[] = student
    ? [{ personalizedFor: student, adaptiveStage: '(one student)' }]
    : await LearningCurriculum.find({
      tenantId, journeyKind: FOUNDATION_JOURNEY_KIND, personalizedFor: { $ne: null },
      roadmapVersion: { $ne: 'ROADMAP_V2' }, ...(stage ? { adaptiveStage: stage } : {}),
    }).select('personalizedFor adaptiveStage').lean() as any[];
  console.log(`${list.length} roadmap(s) to ${apply ? 'rebuild' : 'check — DRY RUN, nothing is written'}\n`);

  let ok = 0;
  const failed: string[] = [];
  for (const [i, c] of list.entries()) {
    const id = String(c.personalizedFor);
    try {
      const r = await rebuildRoadmap(tenantId, id, { apply, by: 'rv2Rebuild script' });
      if (!r.ok || !r.after) { failed.push(`${id} (${c.adaptiveStage}): ${r.reason || 'not rebuilt'}`); continue; }
      ok++;
      const how = r.mode === 'FUTURE' ? `kept ${r.after.keptDays.length} done/open day(s), rest rebuilt` : 'whole roadmap';
      console.log(`  ${i + 1}/${list.length} ${id} ${r.stageKey}: ${how} → ${r.after.phaseDays.revision ? `${r.after.phaseDays.revision} revision, ` : ''}${r.after.phaseDays.bridge} bridge, ${r.after.phaseDays.year} year`);
    } catch (e: any) {
      failed.push(`${id} (${c.adaptiveStage}): ${e?.message || e}`);
    }
  }
  console.log(`\n${apply ? 'Rebuilt' : 'Can be rebuilt'}: ${ok}   Not: ${failed.length}`);
  for (const f of failed) console.log(`  ✗ ${f}`);
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('FAILED:', e?.message || e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
