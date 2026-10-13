/**
 * Video lessons — how much of each year has one, and put lessons added since a roadmap was built
 * onto its days (roadmapLessonRefreshService).
 *
 *   node dist/migrations/roadmap-v2/rv2Lessons.js <tenantId>                        report + dry run, writes nothing
 *   node dist/migrations/roadmap-v2/rv2Lessons.js <tenantId> --apply                refresh every roadmap's open days
 *   node dist/migrations/roadmap-v2/rv2Lessons.js <tenantId> --apply --stage=build  one year only
 *   node dist/migrations/roadmap-v2/rv2Lessons.js <tenantId> --apply --student=<id> one student only
 *
 * Run it after uploading videos (or any lesson) to units students already have on their roadmap.
 * Completed days are never touched. Safe to run again: a day already up to date is left alone.
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { videoCoverage, refreshRoadmapLessons } from '../../services/roadmapLessonRefreshService';
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
    console.error('Usage: rv2Lessons <tenantId> [--apply] [--stage=<year>] [--student=<userId>]');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  console.log('Video lessons per year (published units):');
  for (const c of await videoCoverage(tenantId)) {
    const real = c.withVideo - c.placeholderVideos;
    console.log(`  ${c.stageKey.padEnd(11)} ${String(c.units).padStart(3)} units | with a video ${String(c.withVideo).padStart(3)}`
      + ` (placeholder ${c.placeholderVideos}, real ${real}) | without ${c.units - c.withVideo}`);
  }

  const r = await refreshRoadmapLessons(tenantId, { apply, stageKey: stage || null, studentId: student || null });
  console.log(`\nStudent roadmaps: ${r.journeys} checked, ${r.daysChecked} day(s) not yet completed.`);
  console.log(`${apply ? 'Updated' : 'Would update (DRY RUN — nothing written)'}: ${r.daysChanged} day(s)`
    + ` — ${r.videosAdded} video(s) and ${r.itemsAdded - r.videosAdded} other lesson(s) added, ${r.itemsRemoved} unpublished removed.`);
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('FAILED:', e?.message || e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
