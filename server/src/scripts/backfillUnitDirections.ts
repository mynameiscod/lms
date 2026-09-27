/**
 * Give units back the directions their topic always had.
 *
 * ── WHAT WENT WRONG ───────────────────────────────────────────────────────────────────────
 *
 * seedStageCurriculum builds its curriculum topics from the stage map, which carries
 * `applicableDirections`, and its units from the unit dataset, which does not. Skills had
 * already been noticed and are read from a map built off the stage map; directions were not,
 * and were read from the dataset topic, where they are always undefined.
 *
 * So every Year-2 and Year-3 unit was written with an empty direction list.
 *
 * ── WHY NOTHING BROKE, WHICH IS THE PROBLEM ───────────────────────────────────────────────
 *
 * `appliesToDirection` treats an empty list as "everyone", because that is the only default
 * that keeps content authored before directions existed from vanishing. Correct in general,
 * and here it meant the composer offered every track to every student: somebody who chose
 * Mobile was given the Security and the Data units too, the six-sevenths of Year 3 that are
 * supposed to be filtered away were not, and no error was raised anywhere.
 *
 * The one place it showed was directionCoverage, which reported every direction as authoring
 * nothing and every pair of directions as composing an identical plan — which is exactly the
 * report's stated purpose.
 *
 * ── WHY A BACKFILL AND NOT A RE-SEED ──────────────────────────────────────────────────────
 *
 * The seeder writes `applicableDirections` in `$setOnInsert` on purpose: an admin who narrows
 * a unit by hand must not have that undone by the next run. Which also means re-seeding
 * repairs nothing that already exists, so the repair has to be its own deliberate act.
 *
 * ── WHAT IT WILL AND WILL NOT TOUCH ───────────────────────────────────────────────────────
 *
 * Fills a unit ONLY when its own list is empty and its topic has one. A unit an admin has
 * already narrowed is left exactly as it is, and a universal topic stays empty, because empty
 * means everyone and that is the correct answer for a universal topic rather than a gap.
 *
 *   npx ts-node src/scripts/backfillUnitDirections.ts <tenantId> [stageKey]
 *   npx ts-node src/scripts/backfillUnitDirections.ts <tenantId> [stageKey] --apply
 *
 * With no stageKey every stage on the tenant is considered.
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import LearningCurriculum from '../models/LearningCurriculum';

const run = async () => {
  const tenantId = process.argv[2];
  const stageArg = process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : null;
  const apply = process.argv.includes('--apply');

  if (!tenantId) {
    console.error('Usage: backfillUnitDirections.ts <tenantId> [stageKey] [--apply]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  /**
   * ONLY THE SPINES. LearningCurriculum holds two different things under one collection: the
   * curriculum spine for a stage, and a composed journey for a student — and on a working
   * tenant the journeys outnumber the spines many times over. A journey carries no topics, so
   * that is the discriminator; without it this walks two dozen empty documents per stage,
   * reports each one separately, and reads its directions from whichever it happened to see.
   */
  const all = await LearningCurriculum.find(
    stageArg ? { tenantId, adaptiveStage: stageArg } : { tenantId },
  ).select('adaptiveStage title topics').lean() as any[];

  const curricula = all.filter(c => ((c.topics || []) as any[]).length > 0);

  console.log(`\nBACKFILL UNIT DIRECTIONS — tenant ${tenantId} — ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`  curriculum documents ${all.length} · spines with topics ${curricula.length}`);

  const seen = new Set<string>();
  for (const c of curricula) {
    if (seen.has(c.adaptiveStage)) {
      console.error(`\n  REFUSED: more than one spine carries topics for stage "${c.adaptiveStage}".`);
      console.error('  Which one is authoritative is not something this script may guess.\n');
      await mongoose.disconnect();
      process.exit(1);
    }
    seen.add(c.adaptiveStage);
  }

  let totalFill = 0;
  let totalKept = 0;
  let totalUniversal = 0;
  const ops: any[] = [];

  for (const c of curricula) {
    const stageKey = c.adaptiveStage;
    if (!stageKey) continue;

    /** topicCode -> the directions the stage map declared for it. */
    const byTopic = new Map<string, string[]>();
    for (const t of (c.topics || []) as any[]) {
      if (t.topicCode) byTopic.set(String(t.topicCode), (t.applicableDirections || []).map(String));
    }

    const units = await CurriculumLearningUnit.find({ tenantId, stageKey })
      .select('unitCode topicCode applicableDirections').lean() as any[];

    let fill = 0;
    let kept = 0;
    let universal = 0;
    const perDirection: Record<string, number> = {};

    for (const u of units) {
      const own = (u.applicableDirections || []).filter(Boolean);
      const fromTopic = byTopic.get(String(u.topicCode)) || [];

      if (own.length) { kept++; continue; }
      if (!fromTopic.length) { universal++; continue; }

      fill++;
      fromTopic.forEach(d => { perDirection[d] = (perDirection[d] || 0) + 1; });
      ops.push({
        updateOne: {
          filter: { tenantId, unitCode: u.unitCode },
          update: { $set: { applicableDirections: fromTopic } },
        },
      });
    }

    console.log(`\n  ${stageKey}`);
    console.log(`    units                          ${units.length}`);
    console.log(`    already carrying directions    ${kept}   (left alone)`);
    console.log(`    on a universal topic           ${universal}   (empty is correct: everyone)`);
    console.log(`    would gain directions          ${fill}`);
    Object.entries(perDirection).sort((a, b) => b[1] - a[1])
      .forEach(([k, n]) => console.log(`        ${k.padEnd(22)} ${n}`));

    totalFill += fill; totalKept += kept; totalUniversal += universal;
  }

  console.log(`\n  TOTAL  fill ${totalFill} · kept ${totalKept} · universal ${totalUniversal}`);

  if (!apply) {
    console.log('\n  Dry run. Nothing was written.\n');
  } else if (!ops.length) {
    console.log('\n  Nothing to write.\n');
  } else {
    const r = await CurriculumLearningUnit.bulkWrite(ops, { ordered: false });
    console.log(`\n  WRITTEN. ${r.modifiedCount} unit(s) updated.\n`);
  }

  await mongoose.disconnect();
};

run().catch(e => { console.error(e); process.exit(1); });
