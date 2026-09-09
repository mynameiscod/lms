/**
 * Import the exported question bank into a tenant.
 *
 * WHAT PROBLEM THIS SOLVES. A fresh local database has no questions mapped to skills, so the
 * assessment refuses to generate and every first-year sees "check back shortly". Authoring
 * 1,607 questions by hand is not a setup step. This restores a real, working pool in one
 * command so the whole flow — assessment, Skill DNA, adaptive plan — can be exercised.
 *
 * WHAT IS IN THE FILE. Questions and their skill mappings. Nothing about any student: no users,
 * no submissions, no scores. The tenant id was stripped on export, so it imports into whichever
 * tenant you name.
 *
 * IDEMPOTENT, AND THE IDS ARE PRESERVED ON PURPOSE. A question keeps the _id it had, because the
 * mapping table points at questions BY id — regenerating them would produce 1,607 questions that
 * nothing maps to, which is indistinguishable from importing nothing at all. Re-running updates
 * in place rather than duplicating.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx ts-node src/scripts/importQuestionBank.ts <tenantId>
 *   npx ts-node src/scripts/importQuestionBank.ts <tenantId> --apply
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';

/** Without this the fallback URI wins and the script silently works on the wrong database. */
dotenv.config();

const FILE = path.join(__dirname, '..', 'seeds', 'careerPilot', 'data', 'questionBank.json');

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId) {
    console.error('Usage: importQuestionBank.ts <tenantId> [--apply]');
    process.exit(1);
  }
  if (!fs.existsSync(FILE)) {
    console.error(`Missing ${FILE}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  console.log(`file: ${data.questions.length} questions, ${data.mappings.length} mappings`);

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/lms');
  const db = mongoose.connection;

  /**
   * The mappings are useless without their skills.
   *
   * Checked BEFORE writing anything: importing 1,607 mappings that point at skills which do not
   * exist produces a pool the generator will skip entirely, and the symptom is identical to
   * having imported nothing. Better to refuse and say which command to run first.
   */
  const wanted: string[] = [...new Set<string>(data.mappings.map((m: any) => String(m.skillKey).toUpperCase()))];
  const known = await db.collection('careerskills').find({ key: { $in: wanted } }).project({ key: 1 }).toArray();
  const knownSet = new Set(known.map((k: any) => String(k.key).toUpperCase()));
  const missing = wanted.filter(k => !knownSet.has(k));

  if (missing.length) {
    console.error(`\nREFUSED — ${missing.length} skills in this bank do not exist in your taxonomy:`);
    console.error('  ' + missing.slice(0, 15).join(', ') + (missing.length > 15 ? ' …' : ''));
    console.error('\nSeed the taxonomy first, then run this again:');
    console.error('  npx ts-node src/scripts/seedCareerSkills.ts --apply');
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`taxonomy: all ${wanted.length} skills present`);

  const existingQ = await db.collection('questions')
    .countDocuments({ _id: { $in: data.questions.map((q: any) => new mongoose.Types.ObjectId(q._id)) } });
  const existingM = await db.collection('skillevidences').countDocuments({ tenantId, sourceType: 'question' });
  console.log(`already present: ${existingQ} questions, ${existingM} mappings for this tenant`);

  if (!apply) {
    console.log(`\nDRY RUN — would write ${data.questions.length} questions and ${data.mappings.length} mappings`);
    console.log('Pass --apply to write.');
    await mongoose.disconnect();
    return;
  }

  // Questions. _id preserved so the mappings below still find them.
  const qOps = data.questions.map((q: any) => ({
    updateOne: {
      filter: { _id: new mongoose.Types.ObjectId(q._id) },
      update: {
        $set: {
          ...q,
          _id: new mongoose.Types.ObjectId(q._id),
          tenantId,
          createdAt: q.createdAt ? new Date(q.createdAt) : new Date(),
          updatedAt: new Date(),
        },
      },
      upsert: true,
    },
  }));
  const qRes = await db.collection('questions').bulkWrite(qOps, { ordered: false });
  console.log(`questions: ${qRes.upsertedCount} inserted, ${qRes.modifiedCount} updated`);

  // Mappings, on the same unique key the model enforces.
  const mOps = data.mappings.map((m: any) => ({
    updateOne: {
      filter: { sourceType: m.sourceType, sourceId: m.sourceId, skillKey: m.skillKey },
      update: {
        $set: {
          tenantId, sourceType: m.sourceType, sourceId: m.sourceId,
          skillKey: String(m.skillKey).toUpperCase(),
          contribution: m.contribution || 'PRIMARY',
          active: m.active !== false,
          audienceRoles: m.audienceRoles || [], audienceYears: m.audienceYears || [],
          audienceCourses: m.audienceCourses || [], audienceBranches: m.audienceBranches || [],
          updatedAt: new Date(),
        },
        $setOnInsert: { createdAt: new Date() },
      },
      upsert: true,
    },
  }));
  const mRes = await db.collection('skillevidences').bulkWrite(mOps, { ordered: false });
  console.log(`mappings : ${mRes.upsertedCount} inserted, ${mRes.modifiedCount} updated`);

  console.log('\nDone. Next:');
  console.log(`  npx ts-node src/scripts/localAdaptiveDoctor.ts ${tenantId} --fix`);
  console.log(`  npx ts-node src/scripts/fitCareerPilotToPool.ts ${tenantId}`);

  await mongoose.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
