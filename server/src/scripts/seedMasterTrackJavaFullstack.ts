/**
 * Seed the mentor-approved "Java Fullstack — Job Switcher" MASTER-TRACK.
 *
 * This is a TEMPLATE (isMasterTrack: true), not a student enrolment. The
 * assessment funnel clones + personalizes it per candidate
 * (see trackPersonalizationService). Topics are tagged with the assessment
 * `dimension` they build, so personalization can compress areas the candidate
 * already mastered and expand their weak ones.
 *
 * Idempotent. Run:  npx ts-node src/scripts/seedMasterTrackJavaFullstack.ts <tenantId>
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from '../config/database';
import LearningCurriculum from '../models/LearningCurriculum';

const tenantId = process.argv[2];
if (!tenantId) {
  console.error('Usage: npx ts-node src/scripts/seedMasterTrackJavaFullstack.ts <tenantId>');
  process.exit(1);
}

const ROLE = 'java_fullstack';
const TITLE = 'Java Fullstack — Job Switcher';

// Topic skeleton. `dimension` links each topic to an assessment sub-score axis
// (aptitude | fundamentals | dsa | core_stack | problem_solving | system_design).
// Topics with no dimension are "always include" (interview/resume prep).
const TOPICS = [
  { title: 'Core Java & OOP',            dimension: 'core_stack',      order: 0, startDay: 1,  endDay: 8,  color: '#6650d8' },
  { title: 'DSA Essentials',             dimension: 'dsa',             order: 1, startDay: 9,  endDay: 15, color: '#8b78ff' },
  { title: 'Problem-Solving Patterns',   dimension: 'problem_solving', order: 2, startDay: 16, endDay: 20, color: '#14a89c' },
  { title: 'Spring Boot & REST APIs',    dimension: 'core_stack',      order: 3, startDay: 21, endDay: 30, color: '#0ea5a3' },
  { title: 'Databases & SQL',            dimension: 'fundamentals',    order: 4, startDay: 31, endDay: 36, color: '#003d82' },
  { title: 'React Frontend',             dimension: 'core_stack',      order: 5, startDay: 37, endDay: 44, color: '#0a2a5e' },
  { title: 'System Design',              dimension: 'system_design',   order: 6, startDay: 45, endDay: 49, color: '#e0457b' },
  { title: 'Interview & Resume Prep',    dimension: undefined,         order: 7, startDay: 50, endDay: 52, color: '#e8830c' },
];

async function main() {
  await connectDB();

  const doc = {
    tenantId,
    title: TITLE,
    description: 'Mentor-approved master-track for working professionals switching into Java Fullstack roles. The assessment funnel personalizes this per candidate.',
    targetCourse: 'Java Fullstack',
    totalDays: 52,
    topics: TOPICS,
    isPublished: true,
    isMasterTrack: true,
    role: ROLE,
    audienceLevel: 'professional' as const,
    pace: { hoursPerDay: 1.5, weekends: false, targetWeeks: 9 },
    createdBy: 'seed-script',
  };

  const existing = await LearningCurriculum.findOne({ tenantId, isMasterTrack: true, role: ROLE, audienceLevel: 'professional' });
  if (existing) {
    existing.set({ title: doc.title, description: doc.description, targetCourse: doc.targetCourse, totalDays: doc.totalDays, topics: doc.topics, pace: doc.pace, isPublished: true });
    await existing.save();
    console.log('Updated existing master-track:', String(existing._id));
  } else {
    const created = await LearningCurriculum.create(doc);
    console.log('Created master-track:', String(created._id));
  }
  console.log(`Role=${ROLE} level=professional  ${TOPICS.length} topics, ${doc.totalDays} days, pace ${doc.pace.hoursPerDay}h/day ~${doc.pace.targetWeeks}wks.`);
  console.log('Mentor: refine the topics/day-ranges in Curriculum Builder. The funnel clones & personalizes this per candidate.');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((e) => { console.error('[seedMasterTrack] failed:', e); process.exit(1); });
