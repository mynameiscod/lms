/**
 * One-off backfill: infer `primaryTech` for quizzes lacking it. Quizzes have no
 * topics/languages, so inference is from title + description keywords only.
 * Confident matches are set; ambiguous ones are LEFT UNSET (show as "Untagged").
 *
 * Dry run:  node dist/scripts/backfillQuizTech.js
 * Apply:    APPLY=1 node dist/scripts/backfillQuizTech.js
 */
import mongoose from 'mongoose';
import Quiz from '../models/Quiz';

function inferTech(q: any): string | null {
  const text = `${q.title || ''} ${q.description || ''}`.toLowerCase();
  if (/\breact\b|jsx|usestate|useeffect/.test(text)) return 'react';
  if (/html|css|bootstrap|web ?page|responsive|flexbox/.test(text)) return 'html_css';
  if (/\bsql\b|database|\bjoins?\b|\bschema\b|select \*/.test(text)) return 'sql';
  if (/\bpython\b|pandas|numpy/.test(text)) return 'python';
  if (/\btypescript\b/.test(text)) return 'typescript';
  if (/\bc\+\+|\bcpp\b/.test(text)) return 'cpp';
  if (/\bc#|c-?sharp|\.net\b/.test(text)) return 'csharp';
  if (/\bjava\b|jvm|oop|inheritance|polymorphism|interface/.test(text)) return 'java';
  if (/javascript|\bnode\.?js\b|\bes6\b|\bjs\b/.test(text)) return 'javascript';
  if (/data structure|algorithm|\bdsa\b|linked list|binary tree|sorting|recursion/.test(text)) return 'dsa';
  return null;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  await mongoose.connect(uri);
  const apply = process.env.APPLY === '1';

  const items = await Quiz.find({ $or: [{ primaryTech: { $exists: false } }, { primaryTech: null }, { primaryTech: '' }] })
    .select('title description primaryTech').lean();

  const counts: Record<string, number> = {};
  let tagged = 0, untagged = 0;
  const ops: any[] = [];
  for (const q of items) {
    const tech = inferTech(q);
    if (tech) { counts[tech] = (counts[tech] || 0) + 1; tagged++; ops.push({ updateOne: { filter: { _id: q._id }, update: { $set: { primaryTech: tech } } } }); }
    else untagged++;
  }

  console.log(`\n=== Quiz primaryTech backfill (${apply ? 'APPLY' : 'DRY RUN'}) ===`);
  console.log(`candidates: ${items.length}  | would tag: ${tagged}  | untagged: ${untagged}`);
  console.log('by tech:', JSON.stringify(counts, null, 2));
  if (apply && ops.length) { const r = await Quiz.bulkWrite(ops); console.log(`APPLIED — modified ${r.modifiedCount}`); }
  else if (!apply) console.log('(dry run — set APPLY=1 to write)');
  await mongoose.disconnect();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
