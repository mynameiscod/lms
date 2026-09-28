/**
 * repair-duplicate-answers.js — collapse the duplicate answer records created by the
 * 22 September 2026 race, and report exactly whose marks change.
 *
 * ── WHAT WENT WRONG ───────────────────────────────────────────────────────────────────────
 *
 * Two write paths touched the same `answers` array without being able to see each other.
 * `saveAnswer` did a guarded atomic upsert against the database. `runCode` loaded the attempt,
 * pushed an element into the in-memory array when it did not find one, and wrote the whole
 * document back with `attempt.save()`. Interleaved, both created the element and the
 * full-document save put a second copy back.
 *
 * 137 of 291 attempts ended up with two or more records for the same question. 135 of those
 * disagreed with each other. Grading read the first match, so candidates were marked wrong on
 * questions they had in fact answered.
 *
 * The write path is fixed (see server/src/services/attemptAnswerWriter.ts) and grading now
 * de-duplicates as it reads, so no new damage is possible and already-damaged attempts grade
 * correctly from now on. This script repairs the STORED documents, so that the database itself
 * stops carrying contradictory records — needed before results are published and before anyone
 * exports or audits this data.
 *
 * ── HOW IT DECIDES WHICH RECORD TO KEEP ───────────────────────────────────────────────────
 *
 * Deliberately the same rule as the read path, so a repaired attempt and an unrepaired one
 * grade identically:
 *
 *   1. A record containing actual work always beats an empty one. This is the important rule:
 *      it is what recovers the candidates who were marked wrong.
 *   2. Between two records that both contain work, the later `answeredAt` wins — that is the
 *      candidate's final intent.
 *   3. Ties fall back to run count, then to array order.
 *
 * ── IT WILL NOT SILENTLY CHANGE A SCORE ──────────────────────────────────────────────────
 *
 * Any attempt that is already graded and whose kept record differs from the record grading
 * originally used is listed by name in the report, because someone has to decide whether to
 * re-grade it and to tell that candidate. The repair does not re-grade and does not touch
 * scores; it only removes the duplicate records.
 *
 * USAGE:
 *
 *   node scripts/repair-duplicate-answers.js                  # dry run: reports, changes nothing
 *   node scripts/repair-duplicate-answers.js --apply          # write the collapsed arrays
 *   node scripts/repair-duplicate-answers.js --exam <id>      # limit to one exam
 *   node scripts/repair-duplicate-answers.js --apply --requeue-grading
 *                                                            # also set grading.status=pending
 *                                                            # on attempts whose kept record
 *                                                            # differs from the graded one
 */
const mongoose = require('mongoose');

const APPLY = process.argv.includes('--apply');
const REQUEUE = process.argv.includes('--requeue-grading');
const examArg = process.argv.indexOf('--exam');
const EXAM_ID = examArg !== -1 ? process.argv[examArg + 1] : null;

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set. Run this inside the server container, or export it.');
  process.exit(1);
}

/** Does this record contain anything the candidate would mind losing? */
function hasWork(a) {
  return Boolean(
    (Array.isArray(a.selectedOptionIds) && a.selectedOptionIds.length > 0) ||
    (typeof a.code === 'string' && a.code.trim().length > 0) ||
    (typeof a.text === 'string' && a.text.trim().length > 0)
  );
}

/** Higher wins. Must stay identical to scoreEvidence() in attemptAnswerWriter.ts. */
function evidence(a) {
  const base = hasWork(a) ? 1e15 : 0;
  const when = a.answeredAt ? new Date(a.answeredAt).getTime() : 0;
  return base + when + (a.runCount || 0);
}

function summarise(a) {
  const bits = [];
  if (Array.isArray(a.selectedOptionIds) && a.selectedOptionIds.length) {
    bits.push(`options=[${a.selectedOptionIds.join(',')}]`);
  }
  if (a.code && a.code.trim()) bits.push(`code=${a.code.trim().length}ch`);
  if (a.text && a.text.trim()) bits.push(`text=${JSON.stringify(a.text.trim().slice(0, 30))}`);
  if (!bits.length) bits.push('EMPTY');
  if (a.answeredAt) bits.push(`at=${new Date(a.answeredAt).toISOString()}`);
  if (a.runCount) bits.push(`runs=${a.runCount}`);
  if (a.graded) bits.push(`graded score=${a.score}`);
  return bits.join(' ');
}

(async () => {
  await mongoose.connect(MONGODB_URI);
  const attempts = mongoose.connection.db.collection('hackathonexamattempts');

  const filter = EXAM_ID ? { examId: new mongoose.Types.ObjectId(EXAM_ID) } : {};
  const docs = await attempts.find(filter).toArray();

  console.log(`\n${APPLY ? 'APPLY' : 'DRY RUN'} — scanned ${docs.length} attempt(s)` +
              (EXAM_ID ? ` in exam ${EXAM_ID}` : ' across every exam'));
  console.log('='.repeat(96));

  let damaged = 0;
  let recordsRemoved = 0;
  const scoreAtRisk = [];   // graded attempts where the kept record is not the one graded
  const recovered = [];     // questions where an empty record was hiding real work

  for (const doc of docs) {
    const answers = Array.isArray(doc.answers) ? doc.answers : [];

    const groups = new Map();
    for (const a of answers) {
      const k = String(a.itemId);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(a);
    }

    const dupKeys = [...groups.keys()].filter(k => groups.get(k).length > 1);
    if (!dupKeys.length) continue;

    damaged++;
    const who = `${doc.memberName || '(no name)'} <${doc.memberMobile || '?'}> attempt ${doc._id}`;
    console.log(`\n${who}`);
    console.log(`  ${answers.length} records for ${groups.size} questions — ${dupKeys.length} duplicated`);

    // Rebuild in original first-seen order, keeping the best record per question.
    const kept = [];
    for (const [k, list] of groups) {
      const best = list.reduce((a, b) => (evidence(b) > evidence(a) ? b : a));
      kept.push(best);

      if (list.length > 1) {
        recordsRemoved += list.length - 1;
        for (const a of list) {
          console.log(`    ${a === best ? 'KEEP  ' : 'drop  '}${summarise(a)}`);
        }

        /*
         * Grading used to take the FIRST record. If the first record was empty and another
         * held real work, this candidate was marked wrong on a question they answered.
         */
        const first = list[0];
        if (first !== best && !hasWork(first) && hasWork(best)) {
          recovered.push({ who, itemId: k });
          console.log('    ^^ RECOVERED: grading had taken the empty record. This candidate was marked wrong.');
        }
        if (doc.grading && doc.grading.status === 'graded' && first !== best) {
          scoreAtRisk.push({ who, itemId: k, attemptId: doc._id });
        }
      }
    }

    if (APPLY) {
      const update = { $set: { answers: kept } };
      if (REQUEUE && doc.grading && doc.grading.status === 'graded' &&
          scoreAtRisk.some(r => String(r.attemptId) === String(doc._id))) {
        update.$set['grading.status'] = 'pending';
        update.$set['grading.attempts'] = 0;
        console.log('    → re-queued for grading');
      }
      await attempts.updateOne({ _id: doc._id }, update);
      console.log(`    → written: ${answers.length} records → ${kept.length}`);
    }
  }

  console.log(`\n${'='.repeat(96)}`);
  console.log(`Attempts with duplicate records : ${damaged}`);
  console.log(`Duplicate records ${APPLY ? 'removed' : 'that would be removed'} : ${recordsRemoved}`);
  console.log(`Answers recovered from an empty record : ${recovered.length}`);

  if (recovered.length) {
    console.log('\nTHESE CANDIDATES WERE MARKED WRONG ON A QUESTION THEY ANSWERED:');
    for (const r of recovered) console.log(`  - ${r.who}  question ${r.itemId}`);
  }

  if (scoreAtRisk.length) {
    console.log(`\n${scoreAtRisk.length} already-graded record(s) differ from what grading used.`);
    console.log('Their stored scores were produced from a record this repair does not keep.');
    console.log(APPLY && REQUEUE
      ? 'They have been re-queued; the grading worker will re-score them.'
      : 'Re-run with --apply --requeue-grading to have the worker re-score them.');
  }

  if (!APPLY && damaged) {
    console.log('\nNothing was changed. Re-run with --apply to write the collapsed arrays.');
  }
  if (!damaged) {
    console.log('\nNo duplicate answer records found. Nothing to repair.');
  }

  await mongoose.disconnect();
})().catch(e => {
  console.error('\nFAILED:', e);
  process.exit(1);
});
