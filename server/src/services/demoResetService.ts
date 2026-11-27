import mongoose from 'mongoose';
import User from '../models/User';
import { isDemoPassport } from '../data/demoPolicy';

/**
 * Resetting a demo account between college visits. Two depths:
 *
 *   PROGRESS — the demo starts fresh: days done, practice, Thinking Lab, interviews, checkpoints,
 *     projects, XP, coins, badges, streaks, welcome days and activity are cleared. The skill check,
 *     Skill DNA, every year's roadmap and the demo access stay.
 *
 *   FULL — back to just-signed-up: everything above, plus the skill check, Skill DNA, every roadmap,
 *     the setup answers and the demo access itself. The membership the account had before its demo
 *     is put back. Only the sign-up (name, phone, password) survives.
 *
 * Refused for anything that is not a demo account, so this can never touch a real student.
 * Payments are never deleted: a demo account should have none, and if it does they are records.
 */

type Row = { coll: string; field: string };

/** Everything a student DOES, by collection and the field naming them. */
const PROGRESS: Row[] = [
  { coll: 'dailychallenges', field: 'studentId' },
  { coll: 'thinkingprofiles', field: 'studentId' },
  { coll: 'problemsubmissions', field: 'userId' },
  { coll: 'problemattempts', field: 'studentId' },
  { coll: 'passportinterviews', field: 'studentId' },
  { coll: 'quizattempts', field: 'studentId' },
  { coll: 'quizsubmissions', field: 'studentId' },
  { coll: 'submissions', field: 'student' },
  { coll: 'codesnippetsubmissions', field: 'studentId' },
  { coll: 'mocktestattempts', field: 'studentId' },
  { coll: 'communicationattempts', field: 'studentId' },
  { coll: 'communicationstreaks', field: 'studentId' },
  { coll: 'communicationprofiles', field: 'studentId' },
  { coll: 'communicationachievements', field: 'studentId' },
  { coll: 'speakingsubmissions', field: 'studentId' },
  { coll: 'xpledgers', field: 'studentId' },
  { coll: 'coinledgers', field: 'studentId' },
  { coll: 'coinaccounts', field: 'studentId' },
  { coll: 'studentbadges', field: 'studentId' },
  { coll: 'studentgamestats', field: 'studentId' },
  { coll: 'orientationprogresses', field: 'studentId' },
  { coll: 'careerpilotactivities', field: 'userId' },
  { coll: 'studentactivitylogs', field: 'userId' },
  { coll: 'mentorchats', field: 'studentId' },
  { coll: 'passportresumes', field: 'studentId' },
  { coll: 'lessonprogresses', field: 'studentId' },
  { coll: 'studentconceptprogresses', field: 'studentId' },
  { coll: 'studentnotes', field: 'studentId' },
  { coll: 'studentbookmarks', field: 'studentId' },
  { coll: 'bookprogresses', field: 'userId' },
  { coll: 'playgroundprograms', field: 'userId' },
  { coll: 'drillattempts', field: 'studentId' },
  { coll: 'jobapplications', field: 'studentId' },
  { coll: 'passportprogresses', field: 'studentId' },
];

/** What the skill check and the roadmaps are made of — cleared by a FULL reset only. */
const ASSESSMENT: Row[] = [
  { coll: 'personalizedassessments', field: 'studentId' },
  { coll: 'passportattempts', field: 'studentId' },
  { coll: 'studentskillevidences', field: 'studentId' },
  { coll: 'studentskillprofiles', field: 'studentId' },
  { coll: 'studentcurriculumassignments', field: 'studentId' },
  { coll: 'careerprofiles', field: 'studentId' },
  { coll: 'careerroadmaps', field: 'studentId' },
  { coll: 'curriculumenrollments', field: 'studentId' },
];

/** The setup answers and scores a FULL reset takes off the account (sign-up details stay). */
const SETUP_FIELDS = [
  'onboarded', 'careerDomain', 'primaryRole', 'secondaryRole', 'preferredLanguages', 'preferredTechnologies',
  'careerTrack', 'minutesPerDay', 'daysPerWeek', 'contextCompletedAt', 'contextVersion', 'targetCompanies',
  'careerScore', 'careerScoreSource', 'careerScoreAt', 'careerScoreCoverage', 'careerScoreConfidence',
  'level', 'pathway', 'careerGoal', 'activatedAt', 'trial', 'grant', 'demo',
];

const idValues = (userId: string) => [new mongoose.Types.ObjectId(userId), userId];

async function clear(rows: Row[], userId: string, out: Record<string, number>) {
  const db = mongoose.connection.db!;
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c: any) => c.name));
  for (const r of rows) {
    if (!existing.has(r.coll)) continue;
    const res = await db.collection(r.coll).deleteMany({ [r.field]: { $in: idValues(userId) } });
    if (res.deletedCount) out[r.coll] = (out[r.coll] || 0) + res.deletedCount;
  }
}

export type DemoResetKind = 'progress' | 'full';

export async function resetDemoAccount(tenantId: string, userId: string, kind: DemoResetKind): Promise<{ ok: boolean; message?: string; cleared: Record<string, number> }> {
  const cleared: Record<string, number> = {};
  if (!mongoose.isValidObjectId(userId)) return { ok: false, message: 'Member not found.', cleared };
  const u: any = await User.findOne({ _id: userId, tenantId }).select('passport').lean();
  if (!u) return { ok: false, message: 'Member not found.', cleared };
  if (!isDemoPassport(u.passport)) return { ok: false, message: 'Only a demo account can be reset.', cleared };
  const db = mongoose.connection.db!;
  const sid = new mongoose.Types.ObjectId(userId);

  await clear(PROGRESS, userId, cleared);

  if (kind === 'progress') {
    // Roadmaps stay, with nothing done in them: every day back to not started, today back to day 1.
    const r = await db.collection('curriculumenrollments').updateMany(
      { studentId: { $in: idValues(userId) } },
      { $set: { completedDays: [], completedItems: [], currentDay: 1, xp: 0, timeSpentSeconds: 0, activityDates: [] } },
    );
    if (r.modifiedCount) cleared.curriculumenrollments_reset = r.modifiedCount;
    // The journey clock restarts today.
    await db.collection('passportprogresses').updateOne(
      { tenantId, studentId: sid },
      { $setOnInsert: { tenantId, studentId: sid, startDate: new Date() } },
      { upsert: true },
    );
    return { ok: true, cleared };
  }

  // FULL: the skill check and every roadmap go too, then the account is put back as it was.
  const journeys = await db.collection('learningcurriculums').find({ personalizedFor: sid }).project({ _id: 1 }).toArray();
  if (journeys.length) {
    const ids = journeys.map((j: any) => j._id);
    const dp = await db.collection('dayplans').deleteMany({ curriculumId: { $in: ids } });
    if (dp.deletedCount) cleared.dayplans = dp.deletedCount;
    const lc = await db.collection('learningcurriculums').deleteMany({ _id: { $in: ids } });
    if (lc.deletedCount) cleared.learningcurriculums = lc.deletedCount;
  }
  await clear(ASSESSMENT, userId, cleared);

  const prev = u.passport.demo.previous || {};
  const set: any = { 'passport.active': !!prev.active, 'passport.onboarded': false };
  const unset: any = {};
  for (const f of SETUP_FIELDS) if (f !== 'onboarded') unset[`passport.${f}`] = 1;
  if (prev.expiresAt) set['passport.expiresAt'] = prev.expiresAt; else unset['passport.expiresAt'] = 1;
  if (prev.stage) set['passport.stage'] = prev.stage;
  await User.updateOne({ _id: userId, tenantId }, { $set: set, $unset: unset });
  return { ok: true, cleared };
}
