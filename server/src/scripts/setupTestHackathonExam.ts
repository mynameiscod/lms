/**
 * Stand up one end-to-end test: a hackathon, a confirmed team, an exam, and their attempts.
 *
 *   npx ts-node src/scripts/setupTestHackathonExam.ts <tenantId>            # plan only
 *   npx ts-node src/scripts/setupTestHackathonExam.ts <tenantId> --apply
 *   npx ts-node src/scripts/setupTestHackathonExam.ts <tenantId> --remove   # delete it all again
 *
 * ── WHY A SCRIPT ──────────────────────────────────────────────────────────────────────────
 *
 * Four things have to line up before a candidate can sit anything: the hackathon, a
 * registration whose status is 'confirmed' (provisionAttempts ignores pending_payment), the
 * exam itself, and one attempt per member. Doing that by hand across two admin screens is how
 * a test ends up subtly unlike the real thing — a team that was never really confirmed, or an
 * exam whose sections cannot actually be drawn.
 *
 * It uses the product's own code where it matters: newRegistrationCode for the team code, and
 * provisionAttempts for the attempts, so what comes out is indistinguishable from a real
 * registration rather than a fixture that happens to look similar.
 *
 * ── IT IS REMOVABLE ───────────────────────────────────────────────────────────────────────
 *
 * --remove deletes the hackathon, the registration, the exam and every attempt, matched on the
 * fixed slug rather than on anything typed. This event is created PUBLISHED at the operator's
 * request, so it is visible on the public site while it exists; being able to take it away in
 * one command is what makes that safe to do at all.
 */

import mongoose from 'mongoose';
import Hackathon from '../models/Hackathon';
import HackathonRegistration from '../models/HackathonRegistration';
import HackathonExam from '../models/HackathonExam';
import HackathonExamAttempt from '../models/HackathonExamAttempt';
import { newRegistrationCode, teamNameKeyOf, normalizeMobile } from '../services/hackathonRegistrationService';
import { provisionAttempts } from '../services/hackathonExamService';
import { checkDrawCoverage } from '../services/hackathonExamDrawService';

const SLUG = 'test-hackathon-internal';

/** 20 Sep 2026, 8pm–9pm IST. Stored as UTC; IST is +5:30. */
const START = new Date('2026-09-20T14:30:00.000Z');
const END = new Date('2026-09-20T15:30:00.000Z');

const MEMBERS = [
  { name: 'Sivaprasad',  mobile: '9743545311', email: 'gsivaprasad2009@gmail.com' },
  { name: 'Sai Prasanna', mobile: '7330624595', email: 'gsaiprasanna1996@gmail.com' },
  { name: 'Jaagdeesh',    mobile: '9652942942', email: 'galaba.jaagdeesh@gmail.com' },
  { name: 'Codebegun',    mobile: '7032907714', email: 'codebegun@gmail.com' },
];

async function main() {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  const remove = process.argv.includes('--remove');
  if (!tenantId || tenantId.startsWith('--')) {
    console.error('Usage: setupTestHackathonExam.ts <tenantId> [--apply | --remove]');
    process.exit(1);
  }
  const say = (s = '') => console.log(s);

  /* ── remove ──────────────────────────────────────────────────────────────────────────── */
  if (remove) {
    const h = await Hackathon.findOne({ tenantId, slug: SLUG });
    if (!h) { say('Nothing to remove — no hackathon with slug ' + SLUG); return; }
    const exams = await HackathonExam.find({ hackathonId: h._id }).select('_id').lean();
    const examIds = exams.map((e: any) => e._id);
    const a = await HackathonExamAttempt.deleteMany({ examId: { $in: examIds } });
    const e = await HackathonExam.deleteMany({ hackathonId: h._id });
    const r = await HackathonRegistration.deleteMany({ hackathonId: h._id });
    await Hackathon.deleteOne({ _id: h._id });
    say(`Removed: ${a.deletedCount} attempts, ${e.deletedCount} exam(s), ${r.deletedCount} registration(s), 1 hackathon.`);
    return;
  }

  say('─'.repeat(88));
  say(`TEST HACKATHON + EXAM  ·  tenant ${tenantId}  ·  ${apply ? 'APPLY' : 'PLAN ONLY'}`);
  say('─'.repeat(88));
  say(`\n  hackathon : "Test Hackathon (internal)"  slug ${SLUG}  status PUBLISHED`);
  say(`  window    : ${START.toISOString()} → ${END.toISOString()}   (8-9pm IST, 20 Sep 2026)`);
  say(`  team      : testteam · Codebegun · ${MEMBERS.length} members, status confirmed`);
  MEMBERS.forEach((m, i) => say(`      ${i === 0 ? 'lead ' : '     '}${m.mobile}  ${m.email}`));
  say(`  exam      : 60 minutes · MCQ 30 (tag HACKHTON2026_NEC) + coding 1 (untagged pool)`);

  const existing = await Hackathon.findOne({ tenantId, slug: SLUG });
  if (existing) say(`\n  NOTE: this hackathon already exists — re-running updates it in place.`);

  if (!apply) { say('\n  PLAN ONLY — nothing written. Re-run with --apply.'); return; }

  /* ── hackathon ───────────────────────────────────────────────────────────────────────── */
  const h = await Hackathon.findOneAndUpdate(
    { tenantId, slug: SLUG },
    {
      $set: {
        title: 'Test Hackathon (internal)',
        description: 'Internal end-to-end test of the exam flow. Not for public registration.',
        status: 'published', startAt: START, endAt: END,
        feeInr: 0, venue: 'Online',
      },
      $setOnInsert: { tenantId, slug: SLUG },
    },
    { upsert: true, new: true },
  ) as any;
  say(`\n  hackathon ${existing ? 'updated' : 'created'}: ${h._id}`);

  /* ── registration ────────────────────────────────────────────────────────────────────── */
  let reg = await HackathonRegistration.findOne({ hackathonId: h._id, teamNameKey: teamNameKeyOf('testteam') }) as any;
  if (!reg) {
    reg = await HackathonRegistration.create({
      tenantId, hackathonId: h._id,
      teamName: 'testteam', teamNameKey: teamNameKeyOf('testteam'),
      college: 'Codebegun',
      members: MEMBERS.map(m => ({ name: m.name, mobile: normalizeMobile(m.mobile), email: m.email })),
      memberMobiles: MEMBERS.map(m => normalizeMobile(m.mobile)),
      memberEmails: MEMBERS.map(m => m.email.toLowerCase()),
      registrationCode: newRegistrationCode(),
      status: 'confirmed',
      amountInr: 0,
    });
    say(`  registration created: ${reg.registrationCode}`);
  } else {
    say(`  registration exists:  ${reg.registrationCode}`);
  }

  /* ── exam ────────────────────────────────────────────────────────────────────────────── */
  const sections = [
    {
      key: 'mcq', label: 'Multiple Choice', types: ['mcq'], drawCount: 30,
      tags: ['HACKHTON2026_NEC'], minDifficulty: 1, maxDifficulty: 3, marksPerItem: 1,
    },
    {
      /* Deliberately untagged: the only live_code items in this bank carry 'ai-generated',
         not the hackathon tag, so a tagged coding section would find nothing and be refused. */
      key: 'coding', label: 'Coding', types: ['live_code'], drawCount: 1,
      tags: [], minDifficulty: 1, maxDifficulty: 5, marksPerItem: 10,
    },
  ];

  let exam = await HackathonExam.findOne({ tenantId, hackathonId: h._id }) as any;
  if (!exam) {
    exam = await HackathonExam.create({
      tenantId, hackathonId: h._id,
      title: 'Test Hackathon — Round 1',
      status: 'ready', startAt: START, endAt: END, durationMins: 60,
      joinCutoffMins: 30, sections, navigation: 'free',
      reminders: [], inviteChannels: ['email', 'whatsapp'], resultChannels: ['email', 'whatsapp'],
      teamScoreDenominator: 'registered',
    });
    say(`  exam created: ${exam._id}`);
  } else {
    exam.sections = sections as any;
    exam.startAt = START; exam.endAt = END; exam.durationMins = 60;
    await exam.save();
    say(`  exam updated: ${exam._id}`);
  }

  /* ── can it actually be drawn? ───────────────────────────────────────────────────────── */
  const cov = await checkDrawCoverage(exam);
  say(`\n  draw coverage: ${(cov as any).ok ? 'OK' : 'PROBLEM'}`);
  say(`    ${JSON.stringify(cov)}`);

  /* ── attempts ────────────────────────────────────────────────────────────────────────── */
  const prov = await provisionAttempts(exam);
  say(`\n  attempts: ${prov.created} created, ${prov.existing} already there, across ${prov.teams} team(s)`);
  if (prov.skippedTeams.length) say(`    skipped: ${JSON.stringify(prov.skippedTeams)}`);

  say(`\n  TEAM CODE for the candidates: ${reg.registrationCode}`);
  say(`  Each member signs in with that code and their own mobile number.`);
}

mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/lms-saas')
  .then(main)
  .then(() => mongoose.disconnect())
  .catch((e) => { console.error('FAILED:', e?.message || e); process.exit(1); });
