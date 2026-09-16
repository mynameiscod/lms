/**
 * Put a playable video at the top of every day, so the day screen can be SEEN working.
 *
 * ── WHAT THIS IS, AND WHAT IT IS NOT ──────────────────────────────────────────────────────
 *
 * Foundation units own notes, practice, worked examples and checkpoints — and no video at all.
 * The only video rows in the library are the topic-level placeholders the content seed writes,
 * and they carry no unitCode, so no day ever references one and `videoSource` was never set.
 * The result is a day player that has never rendered its first and most prominent item type.
 *
 * This attaches ONE placeholder video to every unit that already owns content, which puts a
 * video first on every day (see contentBundlePolicy.TEACHING_ORDER — `video` leads).
 *
 * THE URL IS A PLACEHOLDER AND IS NOT TEACHING MATERIAL. It is the same link on every unit. It
 * exists to prove the player, the ordering and the layout, and every row it writes says so in
 * its title and description so nobody mistakes it for authored content. Pass --url to point it
 * at something else; pass --remove to take them all away again.
 *
 * ── WHY IT LIVES IN scripts/ AND NOT IN seeds/careerPilot/ ────────────────────────────────
 *
 * `server/src/seeds/careerPilot` is a CERTIFIED_SOURCE (see publishCertifiedPublishSet.ts). Any
 * change under it marks the curriculum as drifted and blocks publication until the whole set is
 * re-certified. A preview aid must not cost a re-certification, so it writes from here instead
 * and touches no authored bundle.
 *
 *   npx ts-node src/scripts/seedPreviewVideos.ts <tenantId>
 *   npx ts-node src/scripts/seedPreviewVideos.ts <tenantId> --apply
 *   npx ts-node src/scripts/seedPreviewVideos.ts <tenantId> --apply --url=https://www.youtube.com/watch?v=XXXXXXXXXXX
 *   npx ts-node src/scripts/seedPreviewVideos.ts <tenantId> --apply --remove
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LearningContentLibrary from '../models/LearningContentLibrary';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';

dotenv.config();

/** Everything this script writes carries this, which is what makes --remove exact. */
const CREATED_BY = 'preview-video-placeholder';

/**
 * The stand-in lesson.
 *
 * One widely-available introductory programming video, used identically everywhere. The player
 * only needs `videoSource: 'youtube'` and a watch?v= or youtu.be/ link — it extracts the id
 * itself (VideoPlayer.tsx) — so any normal YouTube URL works here.
 */
const DEFAULT_URL = 'https://www.youtube.com/watch?v=rfscVS0vtbw';

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  const remove = process.argv.includes('--remove');
  const urlArg = process.argv.find(a => a.startsWith('--url='));
  const url = urlArg ? urlArg.slice('--url='.length) : DEFAULT_URL;

  if (!tenantId) {
    console.error('Usage: seedPreviewVideos.ts <tenantId> [--apply] [--remove] [--url=...]');
    process.exit(1);
  }
  if (!remove && !/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/.test(url)) {
    console.error(`REFUSED — "${url}" has no 11-character YouTube id in it, so the player would render an empty frame.`);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  console.log(`\nPREVIEW VIDEOS  ·  tenant ${tenantId}`);
  console.log(apply ? (remove ? '\nREMOVING\n' : '\nAPPLYING\n') : '\nDRY RUN — pass --apply to write\n');

  if (remove) {
    const existing = await LearningContentLibrary.countDocuments({ tenantId, type: 'video', createdBy: CREATED_BY });
    console.log(`  placeholder videos found: ${existing}`);
    if (apply) {
      const r = await LearningContentLibrary.deleteMany({ tenantId, type: 'video', createdBy: CREATED_BY });
      console.log(`  removed: ${r.deletedCount}`);
      console.log('\nRe-generate any existing journey to drop the video items from its days.');
    }
    await mongoose.disconnect();
    return;
  }

  /**
   * Only units that already own content.
   *
   * A unit with no lesson of its own is PARTIAL and cannot be scheduled, so giving it a video
   * would write a row nothing ever opens — and would quietly lift it to TEACHABLE on the
   * strength of a placeholder, which is exactly the kind of false readiness signal the
   * readiness policy exists to prevent.
   */
  const unitCodes: string[] = await LearningContentLibrary.distinct('unitCode', {
    tenantId, unitCode: { $exists: true, $ne: null }, isPublished: true,
  });
  const units = await CurriculumLearningUnit
    .find({ tenantId, unitCode: { $in: unitCodes } })
    .select('unitCode title topicCode skillKeys defaultDepth').lean() as any[];

  console.log(`  units owning content: ${units.length}`);
  console.log(`  url: ${url}`);

  let written = 0;
  for (const unit of units) {
    written++;
    if (!apply) continue;
    await LearningContentLibrary.updateOne(
      { tenantId, unitCode: unit.unitCode, type: 'video' },
      {
        $set: {
          title: `${unit.title} — video (placeholder)`,
          type: 'video',
          unitCode: unit.unitCode,
          topicCode: unit.topicCode,
          skillKeys: unit.skillKeys || [],
          learningDepth: unit.defaultDepth || 'FOUNDATION',
          isPublished: true,
          videoSource: 'youtube',
          videoUrl: url,
          estimatedDuration: 10,
          // 0 = "complete on open". A placeholder must never gate a student's day on watching it.
          completionThreshold: 0,
          description: 'PLACEHOLDER — a stand-in video so the day player can be reviewed. '
            + 'Replace with the real lesson for this unit, or remove with --remove.',
        },
        $setOnInsert: { tenantId, createdBy: CREATED_BY },
      },
      { upsert: true },
    );
  }

  console.log(`\n${apply ? 'WROTE' : 'WOULD WRITE'} ${written} placeholder video row(s).`);
  if (apply) {
    console.log('Existing journeys keep their stored days — regenerate one to see the video appear.');
    console.log(`Undo:  npx ts-node src/scripts/seedPreviewVideos.ts ${tenantId} --apply --remove`);
  }

  await mongoose.disconnect();
})().catch(async e => {
  console.error('ERR', e?.message || e);
  try { await mongoose.disconnect(); } catch { /* closing */ }
  process.exit(1);
});
