/**
 * Fix ONE wrong answer key: the Python .lower() question in the Foundation bank.
 *
 * THIS IS NOT PART OF THE REMAP WORK. It is a data defect, found while reading the bank for
 * Phase 2, and it is deliberately its own script so that approving a skill-boundary proposal and
 * correcting a wrong key stay separate decisions.
 *
 * THE DEFECT
 *   questions._id = 95c3883661632872716f6039   (skill PYTHON_BASICS, mcq_single, active)
 *   prompt: What is the result/output?  x='Hi'  print(x.lower())
 *   options: A "HI"   B "hi"   C "Hi"   D "Error"
 *   stored key: option A, "HI"
 *   correct answer: option B, "hi"
 *   the question's own stored explanation already says "Tracing Python semantics gives hi."
 *
 * So the explanation and the key contradict each other, and the key is the half that is wrong.
 * The question is active, so every student who answers it correctly is currently marked wrong.
 *
 * WHY IT WAS NEARLY MISSED. The first sweep for key/explanation contradictions lowercased both
 * sides before comparing, which folded "HI" onto "hi" and reported zero contradictions across all
 * 366 — destroying the exact distinction this question exists to test. The sweep was redone
 * case-sensitively and found this one, and only this one.
 *
 * WHAT CHANGES. Questions in the `questions` collection carry the key on the options themselves:
 *   options[0].isCorrect   true  -> false      ("HI")
 *   options[1].isCorrect   false -> true       ("hi")
 *   correctAnswerText      "HI"  -> "hi"       only if the document actually stores it
 *
 * That last one matters and is stated as a condition rather than a fact: the CSV export falls
 * back to the keyed option's text when correctAnswerText is absent, so an exported "HI" does not
 * prove a stored "HI". The script reads the document and reports which it found.
 *
 * Nothing else on the document is touched. The prompt, the options' text, the explanation and
 * the difficulty are all correct as they stand.
 *
 *   npx ts-node src/scripts/fixPythonLowerAnswerKey.ts            # reports, changes nothing
 *   npx ts-node src/scripts/fixPythonLowerAnswerKey.ts --apply    # writes the fix
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Question from '../models/Question';

dotenv.config();

const QUESTION_ID = '95c3883661632872716f6039';
const WRONG_TEXT = 'HI';
const RIGHT_TEXT = 'hi';

async function main() {
  const apply = process.argv.includes('--apply');
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(uri);

  const doc: any = await Question.findById(QUESTION_ID).lean();
  if (!doc) throw new Error(`question ${QUESTION_ID} not found`);

  const options: any[] = doc.options || [];
  // Compare case-sensitively. Folding case here is the mistake that hid this defect.
  const wrongIndex = options.findIndex(o => String(o?.text) === WRONG_TEXT);
  const rightIndex = options.findIndex(o => String(o?.text) === RIGHT_TEXT);

  console.log('');
  console.log(`question        : ${QUESTION_ID}`);
  console.log(`prompt          : ${String(doc.question || doc.text || '').replace(/\s+/g, ' ')}`);
  options.forEach((o, i) => {
    console.log(`  option ${i}      : ${JSON.stringify(String(o?.text))}  isCorrect=${!!o?.isCorrect}`);
  });
  console.log(`correctAnswerText stored: ${doc.correctAnswerText === undefined
    ? 'absent (the CSV value was a fallback, so nothing to change here)'
    : JSON.stringify(doc.correctAnswerText)}`);
  console.log(`explanation     : ${JSON.stringify(String(doc.explanation || ''))}`);

  if (wrongIndex < 0 || rightIndex < 0) {
    throw new Error('refusing to act: the "HI" and "hi" options are not both present as stored');
  }
  if (!options[wrongIndex].isCorrect) {
    console.log('\nAlready fixed: "HI" is no longer keyed correct. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  console.log('');
  console.log('CHANGE');
  console.log(`  options[${wrongIndex}].isCorrect  true  -> false   ("${WRONG_TEXT}")`);
  console.log(`  options[${rightIndex}].isCorrect  false -> true    ("${RIGHT_TEXT}")`);
  if (doc.correctAnswerText !== undefined) {
    console.log(`  correctAnswerText  ${JSON.stringify(doc.correctAnswerText)} -> "${RIGHT_TEXT}"`);
  }

  if (!apply) {
    console.log('\nDry run. Nothing was written. Re-run with --apply to make the change.');
    await mongoose.disconnect();
    return;
  }

  const next = options.map((o, i) => ({ ...o, isCorrect: i === rightIndex }));
  const update: any = { options: next };
  if (doc.correctAnswerText !== undefined) update.correctAnswerText = RIGHT_TEXT;

  await Question.updateOne({ _id: QUESTION_ID }, { $set: update });

  const after: any = await Question.findById(QUESTION_ID).lean();
  const keyed = (after.options || []).filter((o: any) => o.isCorrect).map((o: any) => String(o.text));
  if (keyed.length !== 1 || keyed[0] !== RIGHT_TEXT) {
    throw new Error(`verification failed: keyed options are ${JSON.stringify(keyed)}`);
  }
  console.log(`\nApplied and verified: exactly one option is keyed correct, and it is "${keyed[0]}".`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
