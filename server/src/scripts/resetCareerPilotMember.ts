/**
 * Reset a CareerPilot member back to "just joined", so the funnel can be re-tested.
 *
 * Run in production (inside the container, against the compiled build):
 *   docker exec lms-server-<slot> node dist/scripts/resetCareerPilotMember.js <tenantId> <email> [more emails…] --dry-run
 *   docker exec lms-server-<slot> node dist/scripts/resetCareerPilotMember.js <tenantId> <email> [more emails…]
 *
 * NEVER DELETES THE USER. CareerPilot members are ordinary `users` rows with an embedded
 * `passport` — the same shape as the tenant admin, the instructors and the staff accounts.
 * A "delete all CareerPilot users" would take the administrators with it. This clears the
 * journey and leaves the person, their login, their phone and their LMS record untouched.
 *
 * `passport.product` is deliberately KEPT while `active` is cleared. publicPassportController
 * .signup treats that combination as an abandoned signup and RESUMES it — which re-sends the
 * WhatsApp OTP to the same number. Removing `product` instead would make the account read as
 * an ordinary LMS user and signup would answer "this email is already registered", which is
 * the opposite of what a re-test needs.
 *
 * Targets are named explicitly, one email at a time. There is no "reset every member" mode
 * and there should not be: the blast radius of getting that wrong is the whole tenant.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import StudentSkillProfile from '../models/StudentSkillProfile';
import StudentSkillEvidence from '../models/StudentSkillEvidence';
import CareerRoadmap from '../models/CareerRoadmap';
import PassportProgress from '../models/PassportProgress';
import PassportAttempt from '../models/PassportAttempt';

dotenv.config();

/**
 * The journey, not the person. Identity (name, email, phone), the LMS account and the
 * academic answers from the join form all stay — re-testing the funnel does not require
 * forgetting who someone is, and clearing their phone would break the OTP resume path.
 */
const JOURNEY_FIELDS = [
  'passport.contextCompletedAt', 'passport.contextVersion',
  'passport.primaryRole', 'passport.secondaryRole', 'passport.careerDomain',
  'passport.minutesPerDay', 'passport.daysPerWeek', 'passport.preferredLanguages',
  'passport.preferredTechnologies',
  'passport.activatedAt', 'passport.expiresAt', 'passport.verifiedAt',
  'passport.lastSeenAt',

  /**
   * Career staging, cleared too — this was missed on the first version and it mattered.
   *
   * `stage`, `background` and `stageComputedAt` are caches of degree + academic year, so
   * dropping them costs nothing: the next context write recomputes them. `graduated` is a
   * raw answer rather than a cache, but it is one the legacy CareerProfilePrompt can set
   * independently of academic year — which is how a member reading "2nd Year" ended up
   * staged as a job seeker and was handed an ADVANCED paper the pilot has no content for.
   *
   * A reset that leaves that behind is not a reset: the member signs up again, answers
   * "2nd Year" again, and is staged from the stale flag again.
   */
  'passport.graduated', 'passport.stage', 'passport.background',
  'passport.stageComputedAt', 'passport.monthsToGraduation',
];

async function main() {
  const [tenantId, ...rest] = process.argv.slice(2);
  const dryRun = rest.includes('--dry-run');
  const emails = rest.filter(a => !a.startsWith('--')).map(e => e.trim().toLowerCase()).filter(Boolean);

  if (!tenantId || !emails.length) {
    console.error('Usage: resetCareerPilotMember.js <tenantId> <email> [more emails…] [--dry-run]');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) { console.error('MONGODB_URI is not set.'); process.exit(1); }

  await mongoose.connect(uri);
  try {
    console.log('');
    console.log(dryRun ? '=== DRY RUN — nothing will be written ===' : '=== Resetting CareerPilot members ===');

    for (const email of emails) {
      const user: any = await User.findOne({ email, tenantId }).lean();

      if (!user) { console.log(`  ${email.padEnd(38)} NOT FOUND — skipped`); continue; }
      if (!user.passport?.product) {
        console.log(`  ${email.padEnd(38)} not a CareerPilot member — skipped`);
        continue;
      }
      // Loud, but not fatal: an admin may legitimately be a test member. Saying so beats
      // silently resetting the person who administers the tenant.
      if (user.role !== 'STUDENT') {
        console.log(`  ⚠️  ${email} has role ${user.role} — resetting a non-student account.`);
      }

      const studentId = String(user._id);
      const counts = {
        assessments: await PersonalizedAssessment.countDocuments({ tenantId, studentId }),
        skillProfiles: await StudentSkillProfile.countDocuments({ tenantId, studentId }),
        skillEvidence: await StudentSkillEvidence.countDocuments({ tenantId, studentId }),
        roadmaps: await CareerRoadmap.countDocuments({ tenantId, studentId }),
        progress: await PassportProgress.countDocuments({ tenantId, studentId }),
        attempts: await PassportAttempt.countDocuments({ tenantId, studentId }),
      };

      console.log(`  ${email.padEnd(38)} reset → assessments=${counts.assessments} skillProfiles=${counts.skillProfiles} `
        + `evidence=${counts.skillEvidence} roadmaps=${counts.roadmaps} progress=${counts.progress} attempts=${counts.attempts}`);

      if (dryRun) continue;

      // Journey fields off, membership closed, product kept so signup resumes and re-OTPs.
      await User.updateOne(
        { _id: user._id },
        {
          $unset: JOURNEY_FIELDS.reduce((o, f) => ({ ...o, [f]: '' }), {}),
          $set: { 'passport.active': false, 'passport.product': 'career_passport' },
        },
      );

      await Promise.all([
        PersonalizedAssessment.deleteMany({ tenantId, studentId }),
        StudentSkillProfile.deleteMany({ tenantId, studentId }),
        StudentSkillEvidence.deleteMany({ tenantId, studentId }),
        CareerRoadmap.deleteMany({ tenantId, studentId }),
        PassportProgress.deleteMany({ tenantId, studentId }),
        PassportAttempt.deleteMany({ tenantId, studentId }),
      ]);
    }

    console.log('');
    console.log(dryRun
      ? '  Nothing was written. Re-run without --dry-run to apply.'
      : '  Done. Sign up again with the SAME email and mobile — signup resumes and re-sends the OTP.');
    console.log('');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
