/**
 * Seed a published "starter" Learning Curriculum so the Skill-Assessment funnel
 * can enrol candidates end-to-end. Without at least one PUBLISHED curriculum the
 * roadmap → enrol → preview → unlock tail can never fire.
 *
 * Idempotent — safe to re-run. Replace the placeholder day content in the
 * Curriculum Builder afterwards.
 *
 * Run:  npx ts-node src/scripts/seedStarterCurriculum.ts <tenantId>
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/database';
import LearningCurriculum from '../models/LearningCurriculum';
import DayPlan from '../models/DayPlan';

const tenantId = process.argv[2];
if (!tenantId) {
  console.error('Usage: npx ts-node src/scripts/seedStarterCurriculum.ts <tenantId>');
  process.exit(1);
}

const TITLE = 'Full-Stack Foundations (Starter)';

const DAYS = [
  { d: 1, t: 'Welcome & Setup',     n: 'Set up your environment and learn how the daily plan works. (Placeholder — replace in Curriculum Builder.)' },
  { d: 2, t: 'Programming Basics',  n: 'Variables, data types, control flow. (Placeholder content — free preview day.)' },
  { d: 3, t: 'Functions & OOP',     n: 'Functions, classes, objects. (Placeholder content — unlocks after enrolment.)' },
  { d: 4, t: 'Collections & Data',  n: 'Lists, maps, iteration patterns. (Placeholder content.)' },
  { d: 5, t: 'Intro to the Web',    n: 'HTTP, HTML, CSS basics. (Placeholder content.)' },
  { d: 6, t: 'First Mini Project',  n: 'Build a small app end-to-end. (Placeholder content.)' },
];

async function main() {
  await connectDB();

  let cur: any = await LearningCurriculum.findOne({ tenantId, title: TITLE });
  if (cur) {
    if (!cur.isPublished) { cur.isPublished = true; await cur.save(); console.log('Existing curriculum re-published:', String(cur._id)); }
    else console.log('Curriculum already present:', String(cur._id));
  } else {
    cur = await LearningCurriculum.create({
      tenantId,
      title: TITLE,
      description: 'Auto-seeded starter track so the Skill-Assessment funnel can enrol candidates end-to-end. Replace the day content in Curriculum Builder.',
      targetCourse: 'Full Stack',
      totalDays: 30,
      isPublished: true,
      createdBy: 'seed-script',
      topics: [
        { title: 'Programming Fundamentals',     order: 0, startDay: 1,  endDay: 10, color: '#6650d8' },
        { title: 'Web & Frameworks',             order: 1, startDay: 11, endDay: 20, color: '#14a89c' },
        { title: 'Projects & Interview Prep',    order: 2, startDay: 21, endDay: 30, color: '#003d82' },
      ],
    });
    console.log('Created published curriculum:', String(cur._id));
  }

  for (const day of DAYS) {
    await DayPlan.updateOne(
      { curriculumId: cur._id, dayNumber: day.d },
      {
        $setOnInsert: { tenantId, curriculumId: cur._id, dayNumber: day.d },
        $set: { title: day.t, notes: day.n, items: [] },
      },
      { upsert: true }
    );
  }
  console.log(`Seeded ${DAYS.length} day plans (days 1–2 are the free preview, 3+ lock until unlock).`);
  console.log('Done. New assessment submissions will now enrol into this plan; existing dangling ones fall back to it.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => { console.error('[seedStarterCurriculum] failed:', e); process.exit(1); });
