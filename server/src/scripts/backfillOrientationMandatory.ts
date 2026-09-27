/**
 * Make the welcome required of every member, including the ones the old rule excused.
 *
 * ── WHAT WENT WRONG ───────────────────────────────────────────────────────────────────────
 *
 * An OrientationProgress record is created LAZILY, the first time a member opens the welcome
 * screen, and the old rule fixed `mandatory` at that moment from "had they already started
 * learning?". Two failures followed from the laziness rather than from the rule:
 *
 *   1. A member who reached a learning day before ever loading the welcome screen had their
 *      record created with `mandatory: false`, permanently — the rule read their progress at the
 *      wrong moment and excused them for good.
 *   2. A member who never opened the screen at all has NO record, so there is nothing to ask.
 *      They are not excused, exactly; they were never asked.
 *
 * The product owner's rule is that every member, in every year, does the five welcome days after
 * taking membership. orientationService now writes `mandatory: true` for anybody new. This repairs
 * everybody already in the database.
 *
 * ── PACING IS NOT BACKFILLED, AND THAT IS THE POINT ───────────────────────────────────────
 *
 * A paced member meets one welcome day per calendar day. Pacing somebody who is already mid-
 * journey would therefore shut them out of their own programme for five days — days they have
 * reached and paid for. So a member who has already started is marked `paced: false`: required to
 * do the same five days, free to do all five this afternoon. Only a member who has not begun is
 * paced from today, which is what a new member gets anyway.
 *
 * Records that already carry a pacing decision are never re-paced; only `mandatory` moves.
 *
 *   npx ts-node src/scripts/backfillOrientationMandatory.ts <tenantId>
 *   npx ts-node src/scripts/backfillOrientationMandatory.ts <tenantId> --apply
 *
 * DRY RUN BY DEFAULT.
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import OrientationProgress from '../models/OrientationProgress';
import CurriculumEnrollment from '../models/CurriculumEnrollment';

const run = async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');

  if (!tenantId) {
    console.error('Usage: backfillOrientationMandatory.ts <tenantId> [--apply]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  console.log(`\nOrientation backfill — tenant ${tenantId}${apply ? '' : '   (DRY RUN)'}`);

  /* Everybody enrolled on anything, and how far they have got. */
  const enrollments = await CurriculumEnrollment.find({ tenantId })
    .select('studentId completedDays currentDay').lean() as any[];

  const startedBy = new Map<string, boolean>();
  for (const e of enrollments) {
    const id = String(e.studentId);
    const started = (e.completedDays || []).length > 0 || Number(e.currentDay || 1) > 1;
    /* Any one enrolment that has begun means the member has begun. */
    startedBy.set(id, (startedBy.get(id) || false) || started);
  }

  const progress = await OrientationProgress.find({ tenantId })
    .select('studentId mandatory paced completedDays completedAt').lean() as any[];
  const haveRecord = new Set(progress.map(p => String(p.studentId)));

  /* ── 1. Records written under the old rule ─────────────────────────────────────────────── */
  const excused = progress.filter(p => p.mandatory !== true);
  const alreadyRequired = progress.length - excused.length;
  const excusedButFinished = excused.filter(p => !!p.completedAt).length;

  /* ── 2. Enrolled members with no record at all ─────────────────────────────────────────── */
  const missing = [...startedBy.keys()].filter(id => !haveRecord.has(id));
  const missingStarted = missing.filter(id => startedBy.get(id)).length;

  console.log(`\n  orientation records                 ${progress.length}`);
  console.log(`    already required                  ${alreadyRequired}   (left alone)`);
  console.log(`    excused by the old rule           ${excused.length}   -> required`);
  console.log(`      of those, already finished      ${excusedButFinished}   (nothing changes for them)`);
  console.log(`\n  enrolled members with no record     ${missing.length}   -> record created, required`);
  console.log(`    of those, already learning        ${missingStarted}   (required, but NOT paced)`);

  if (!apply) {
    console.log('\n  Dry run. Nothing was written.\n');
    await mongoose.disconnect();
    return;
  }

  let flipped = 0;
  if (excused.length) {
    const r = await OrientationProgress.updateMany(
      { tenantId, _id: { $in: excused.map(p => p._id) } },
      { $set: { mandatory: true } },
    );
    flipped = r.modifiedCount;
  }

  let created = 0;
  if (missing.length) {
    const now = new Date();
    const docs = missing.map(id => {
      const started = !!startedBy.get(id);
      return {
        tenantId,
        studentId: new mongoose.Types.ObjectId(id),
        completedDays: [],
        items: [],
        mandatory: true,
        startedAt: now,
        /* See the header: pacing a mid-journey member would lock them out for five days. */
        paced: !started,
        ...(started ? {} : { pacedFrom: now }),
      };
    });
    /* `ordered: false` so one racing duplicate key cannot lose the rest of the batch. */
    const r: any = await OrientationProgress.insertMany(docs, { ordered: false }).catch((e: any) => {
      if (e?.code !== 11000 && e?.writeErrors === undefined) throw e;
      return e.insertedDocs || [];
    });
    created = Array.isArray(r) ? r.length : 0;
  }

  console.log(`\n  WRITTEN. ${flipped} record(s) made required, ${created} created.\n`);
  await mongoose.disconnect();
};

run().catch(e => { console.error(e); process.exit(1); });
