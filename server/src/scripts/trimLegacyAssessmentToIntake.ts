/**
 * Trim a tenant's saved Career Readiness bank down to the intake questions.
 *
 * Changing DEFAULT_QUESTIONS in code only affects a tenant whose PassportAssessment is
 * created AFTER the change. Any tenant already running has its own saved copy of the
 * twenty-two questions — possibly edited — and this is what brings it in line.
 *
 *   npx ts-node src/scripts/trimLegacyAssessmentToIntake.ts <tenantId>            # dry run
 *   npx ts-node src/scripts/trimLegacyAssessmentToIntake.ts <tenantId> --apply
 *
 * In production, against the compiled build:
 *   docker exec lms-server-<slot> node dist/scripts/trimLegacyAssessmentToIntake.js <tenantId>
 *
 * DRY RUN BY DEFAULT. This removes questions an admin may have written, so the person
 * running it should read the list first.
 *
 * WHAT IT REMOVES: every GRADED question (correctIndex >= 0). Those are the aptitude,
 * reasoning and generic-technical items the personalised skill assessment now measures
 * properly. WHAT IT KEEPS: every self-report question, including any the admin added —
 * the rule is about the kind of question, not about matching the shipped list, so a
 * tenant's own self-report additions survive.
 *
 * PAST ATTEMPTS ARE NOT TOUCHED. A member's stored result still references the questions
 * they were actually asked, and the result page reads from the attempt. Trimming the bank
 * changes what the NEXT member is asked, and nothing about what an earlier one answered.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import PassportAssessment from '../models/PassportAssessment';

dotenv.config();

async function main() {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');

  if (!tenantId) {
    console.error('Usage: trimLegacyAssessmentToIntake.ts <tenantId> [--apply]');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) { console.error('MONGODB_URI is not set'); process.exit(1); }
  await mongoose.connect(uri);

  const a: any = await PassportAssessment.findOne({ tenantId });
  if (!a) {
    console.log(`No PassportAssessment for tenant ${tenantId} — nothing to trim.`);
    await mongoose.disconnect();
    return;
  }

  const all = a.questions || [];
  const keep = all.filter((q: any) => q.selfReport === true || q.correctIndex === -1);
  const drop = all.filter((q: any) => !(q.selfReport === true || q.correctIndex === -1));

  console.log(`\n=== ${apply ? 'TRIMMING' : 'DRY RUN'} — tenant ${tenantId} ===`);
  console.log(`  questions now      : ${all.length}`);
  console.log(`  keeping (intake)   : ${keep.length}`);
  console.log(`  removing (graded)  : ${drop.length}\n`);

  const byCategory: Record<string, number> = {};
  for (const q of drop) byCategory[q.category] = (byCategory[q.category] || 0) + 1;
  for (const [cat, n] of Object.entries(byCategory)) console.log(`  - ${cat}: ${n}`);

  console.log('\n  questions that would be removed:');
  for (const q of drop) console.log(`    · [${q.category}] ${String(q.text).slice(0, 90)}`);

  console.log('\n  questions that stay:');
  for (const q of keep) console.log(`    · [${q.category}] ${String(q.text).slice(0, 90)}`);

  if (!keep.length) {
    console.log('\n  REFUSING: that would leave the intake empty. Nothing written.');
    await mongoose.disconnect();
    process.exit(1);
  }

  if (apply) {
    a.questions = keep;
    await a.save();
    console.log(`\n✅ Trimmed. The intake now asks ${keep.length} questions.`);
  } else {
    console.log('\n(dry run — nothing written. Re-run with --apply.)');
  }

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
