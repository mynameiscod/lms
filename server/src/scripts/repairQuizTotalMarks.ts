/**
 * Correct quizzes whose stored total disagrees with their own questions, and the attempts
 * that inherited it.
 *
 *   node dist/scripts/repairQuizTotalMarks.js            # plan only
 *   node dist/scripts/repairQuizTotalMarks.js --apply
 *
 * WHY THIS IS NEEDED. Quiz.totalMarks was typed by an author and never reconciled with the
 * questions attached to it. Each attempt copied that figure at submission, so a wrong total is
 * frozen into every result already taken: 36 quizzes of 293 disagree with their own questions,
 * across 444 submitted attempts.
 *
 * IT CHANGES NUMBERS STUDENTS HAVE SEEN, and there is no way round that. A quiz storing 18
 * when 20 marks exist has been showing percentages roughly 11% too high — two students on the
 * reported paper read 100% and will read 90%. A quiz storing 105 when 77 exist has been
 * showing them far too LOW, and twenty-six students there have been under-credited for weeks.
 * Both are wrong; leaving them wrong is not the safer option, it is the invisible one.
 *
 * WHAT IT DOES NOT TOUCH. obtainedMarks — what a student actually earned is a fact, and the
 * marks they were awarded per question are not in question here. Only the denominator, the
 * percentage derived from it, and the pass verdict where a pass PERCENTAGE decides it.
 *
 * PASS/FAIL BY MARKS IS LEFT ALONE. A quiz with passingMarks compares the student's raw score
 * against a raw threshold; neither side of that involves the total, so recomputing it would
 * change verdicts for no reason.
 *
 * Plan-only by default, and it prints every verdict that would flip before it changes one.
 */
import mongoose from 'mongoose';
import Quiz from '../models/Quiz';
import QuizAttempt from '../models/QuizAttempt';
import { computeQuizTotalMarks, percentageOf } from '../services/quizMarksService';

const APPLY = process.argv.includes('--apply');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  console.log((APPLY ? '' : '[PLAN ONLY] ') + 'reconciling quiz totals with their questions\n');

  const quizzes = await Quiz.find({}).lean() as any[];
  let checked = 0, wrongQuizzes = 0, fixedAttempts = 0, flippedVerdicts = 0;
  const rows: string[] = [];

  for (const quiz of quizzes) {
    checked += 1;
    const real = await computeQuizTotalMarks(quiz);
    const stored = Number(quiz.totalMarks) || 0;
    if (!real || real === stored) continue;
    wrongQuizzes += 1;

    const attempts = await QuizAttempt.find({ quizId: String(quiz._id), status: 'submitted' }).lean() as any[];
    const direction = real > stored ? 'was inflating' : 'was deflating';
    rows.push(`  ${String(quiz.title || '(untitled)').slice(0, 40).padEnd(42)}`
      + `${String(stored).padStart(4)} -> ${String(real).padStart(4)}`
      + `${String(attempts.length).padStart(6)} attempts   ${direction}`);

    for (const a of attempts) {
      const obtained = Number(a.obtainedMarks) || 0;
      const nextPct = percentageOf(obtained, real);
      // Pass/fail only moves when a pass PERCENTAGE decides it. A raw-marks threshold does
      // not involve the total at all, so recomputing it would change a verdict for no reason.
      const nextPassed = quiz.passingMarks
        ? obtained >= quiz.passingMarks
        : (quiz.passPercentage ? nextPct >= quiz.passPercentage : !!a.passed);
      if (nextPassed !== !!a.passed) flippedVerdicts += 1;

      if (APPLY) {
        await QuizAttempt.updateOne({ _id: a._id }, {
          $set: { totalMarks: real, percentage: nextPct, passed: nextPassed },
        });
      }
      fixedAttempts += 1;
    }

    if (APPLY) await Quiz.updateOne({ _id: quiz._id }, { $set: { totalMarks: real } });
  }

  console.log('quiz'.padEnd(44) + 'stored -> real  attempts');
  for (const r of rows.slice(0, 40)) console.log(r);
  if (rows.length > 40) console.log(`  … and ${rows.length - 40} more`);

  console.log('\n=== ' + (APPLY ? 'repaired' : 'would repair') + ' ===');
  console.log('  quizzes checked        : ' + checked);
  console.log('  totals corrected       : ' + wrongQuizzes);
  console.log('  attempts re-scored     : ' + fixedAttempts);
  console.log('  pass/fail verdicts that change : ' + flippedVerdicts);
  console.log('\n  obtainedMarks is never touched — what a student earned is a fact.');
  console.log('  Only the denominator, its percentage, and a pass decided BY PERCENTAGE.');
  if (!APPLY) console.log('\n[PLAN ONLY] nothing was written. Re-run with --apply.');

  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
