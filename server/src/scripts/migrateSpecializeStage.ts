/**
 * Give third year its own stage, without third-years losing what they can see today.
 *
 * WHY A MIGRATION AND NOT JUST A CODE CHANGE. Second and third year used to share `build`, and
 * `specialize` splits them. The derivation itself needs no migration — a member's stage is
 * recomputed from degree and academic year on every read, so a third-year resolves correctly the
 * moment the new rule ships. Two things do not recompute, and both fail silently.
 *
 * THE CACHED STAGE. `user.passport.stage` is a copy, written when a profile is saved and read
 * directly by the paths that cannot afford to re-derive — missions, the dashboard, member
 * targeting. Those would go on treating a third-year as `build` until they next saved their
 * profile, so the same student would be one stage to the assessment and another to their
 * missions. Recomputed here rather than cleared: an empty cache reads as "no stage" and serves
 * everything, which is a different wrong answer rather than none.
 *
 * CONTENT TAGGED FOR `build`. This is the one that loses things. A mission or a question tagged
 * `stages: ['build']` reaches second AND third years today, because they are the same stage.
 * After the split it reaches only second years, and every third-year quietly stops seeing
 * content nobody removed. So anything tagged `build` also becomes tagged `specialize`, which
 * preserves exactly today's reach — a truthful starting point that an admin can then narrow
 * deliberately, rather than a silent loss discovered weeks later by a student.
 *
 * NOT TOUCHED: anything already naming `specialize`, so the script is safe to re-run, and
 * anything tagged for other stages, whose reach does not change.
 *
 *   npx ts-node src/scripts/migrateSpecializeStage.ts <tenantId|--all>
 *   npx ts-node src/scripts/migrateSpecializeStage.ts <tenantId|--all> --apply
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { stageFromCourse } from '../services/careerStageService';

dotenv.config();

/** Collections whose documents carry a `stages` array used to decide who sees them. */
const STAGE_TAGGED = [
  'careerskillresources',
  'conceptlearningunits',
  'passportcontents',
];

(async () => {
  const target = process.argv[2];
  const apply = process.argv.includes('--apply');

  if (!target) {
    console.error('Usage: migrateSpecializeStage.ts <tenantId|--all> [--apply]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  const db = mongoose.connection.db;
  const scope: any = target === '--all' ? {} : { tenantId: new mongoose.Types.ObjectId(target) };
  const tagScope: any = target === '--all' ? {} : { tenantId: target };

  /* ---- 1. members whose cached stage is now wrong -------------------------------------- */

  const members = await db.collection('users')
    .find({ ...scope, 'passport.stage': { $exists: true } })
    .project({ 'passport.stage': 1, 'passport.degree': 1, 'passport.yearOfStudy': 1 })
    .toArray();

  const restage: { _id: any; from: string; to: string }[] = [];
  for (const u of members) {
    const p: any = u.passport || {};
    const derived = stageFromCourse(p.degree, p.yearOfStudy);
    // A degree we cannot read gives null, and null must never overwrite a real stage: it would
    // turn "third year" into "unknown" and serve that member everything.
    if (derived && derived !== p.stage) restage.push({ _id: u._id, from: p.stage, to: derived });
  }

  const moves = new Map<string, number>();
  for (const r of restage) moves.set(`${r.from} → ${r.to}`, (moves.get(`${r.from} → ${r.to}`) || 0) + 1);

  console.log(`\nmembers with a cached stage : ${members.length}`);
  console.log(`  needing recomputation     : ${restage.length}`);
  for (const [move, n] of moves) console.log(`    ${move.padEnd(28)} ${n}`);

  /* ---- 2. content that would silently stop reaching third years ------------------------ */

  const widen: { coll: string; n: number }[] = [];
  for (const coll of STAGE_TAGGED) {
    if (!(await db.listCollections({ name: coll }).hasNext())) continue;
    const n = await db.collection(coll).countDocuments({
      ...tagScope, stages: 'build', $nor: [{ stages: 'specialize' }],
    });
    if (n) widen.push({ coll, n });
  }

  console.log('\ncontent tagged for "build" that must also reach third years:');
  if (!widen.length) console.log('  none');
  for (const w of widen) console.log(`  ${w.coll.padEnd(26)} ${w.n} documents`);

  // The embedded question bank is one document per tenant, so its rows are counted separately.
  let embedded = 0;
  if (await db.listCollections({ name: 'passportassessments' }).hasNext()) {
    const docs = await db.collection('passportassessments').find(tagScope).toArray();
    for (const d of docs) {
      embedded += (d.questions || []).filter(
        (q: any) => (q.stages || []).includes('build') && !(q.stages || []).includes('specialize'),
      ).length;
    }
    if (embedded) console.log(`  passportassessments        ${embedded} embedded questions`);
  }

  if (!apply) {
    console.log('\nDRY RUN — nothing written. Pass --apply to migrate.');
    await mongoose.disconnect();
    return;
  }

  for (const r of restage) {
    await db.collection('users').updateOne({ _id: r._id }, { $set: { 'passport.stage': r.to } });
  }

  let widened = 0;
  for (const w of widen) {
    const res = await db.collection(w.coll).updateMany(
      { ...tagScope, stages: 'build', $nor: [{ stages: 'specialize' }] },
      { $addToSet: { stages: 'specialize' } } as any,
    );
    widened += res.modifiedCount;
  }

  let embeddedWidened = 0;
  if (embedded) {
    const docs = await db.collection('passportassessments').find(tagScope).toArray();
    for (const d of docs) {
      let touched = false;
      for (const q of (d.questions || [])) {
        if ((q.stages || []).includes('build') && !(q.stages || []).includes('specialize')) {
          q.stages.push('specialize'); touched = true; embeddedWidened++;
        }
      }
      if (touched) {
        await db.collection('passportassessments').updateOne({ _id: d._id }, { $set: { questions: d.questions } });
      }
    }
  }

  console.log(`\n✅ ${restage.length} members restaged, ${widened} documents and `
    + `${embeddedWidened} embedded questions widened to reach third years.`);
  console.log('   Their reach is unchanged from before the split. Narrow it deliberately from');
  console.log('   the admin screens when you want third-year-specific content.');

  await mongoose.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
