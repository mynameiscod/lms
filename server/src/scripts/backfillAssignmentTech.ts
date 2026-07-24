/**
 * One-off backfill: infer `primaryTech` for assignments that don't have it yet.
 * Confident matches are set; anything ambiguous is LEFT UNSET (shows as "Untagged"
 * in the admin UI for a human to fix). Safe to re-run.
 *
 * Dry run (default):  node dist/scripts/backfillAssignmentTech.js
 * Apply:              APPLY=1 node dist/scripts/backfillAssignmentTech.js
 */
import mongoose from 'mongoose';
import Assignment from '../models/Assignment';

function inferTech(a: any): string | null {
  const text = `${a.title || ''} ${(a.topics || []).join(' ')} ${(a.tags || []).join(' ')}`.toLowerCase();
  const langs = (a.allowedLanguages || []).map((l: string) => String(l).toLowerCase());

  if (/\breact\b|jsx|usestate|useeffect/.test(text)) return 'react';
  if (/html|css|bootstrap|web ?page|responsive|flexbox|media quer/.test(text) || a.type === 'web') return 'html_css';
  if (/\bsql\b|database query|select \*|\bjoins?\b|\bschema\b/.test(text) || a.type === 'sql') return 'sql';
  if (/\bpython\b|\bpandas\b|\bnumpy\b/.test(text)) return 'python';
  if (/\btypescript\b/.test(text)) return 'typescript';
  if (/\bc\+\+|\bcpp\b|std::/.test(text)) return 'cpp';
  if (/\bc#|c-?sharp|\.net\b/.test(text)) return 'csharp';
  if (/\bjava\b|jvm|\.jar\b|interface[s]? &|lambda expression/.test(text)) return 'java';
  if (/javascript|\bnode\.?js\b|\bes6\b|\bjs\b/.test(text)) return 'javascript';
  if (/data structure|algorithm|\bdsa\b|linked list|binary tree|sorting|recursion|two ?sum/.test(text)) return 'dsa';

  // Fall back to a single unambiguous allowed language
  if (langs.length === 1) {
    const map: Record<string, string> = { java: 'java', javascript: 'javascript', typescript: 'typescript', python: 'python', sql: 'sql', cpp: 'cpp', c: 'c', csharp: 'csharp', html: 'html_css', css: 'html_css' };
    return map[langs[0]] || null;
  }
  return null; // ambiguous → leave untagged
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) { console.error('MONGODB_URI not set'); process.exit(1); }
  await mongoose.connect(uri);
  const apply = process.env.APPLY === '1';

  const items = await Assignment.find({ $or: [{ primaryTech: { $exists: false } }, { primaryTech: null }, { primaryTech: '' }] })
    .select('title topics tags allowedLanguages type primaryTech').lean();

  const counts: Record<string, number> = {};
  let tagged = 0, untagged = 0;
  const ops: any[] = [];
  for (const a of items) {
    const tech = inferTech(a);
    if (tech) {
      counts[tech] = (counts[tech] || 0) + 1; tagged++;
      ops.push({ updateOne: { filter: { _id: a._id }, update: { $set: { primaryTech: tech } } } });
    } else { untagged++; }
  }

  console.log(`\n=== Assignment primaryTech backfill (${apply ? 'APPLY' : 'DRY RUN'}) ===`);
  console.log(`candidates (no primaryTech): ${items.length}`);
  console.log(`would tag: ${tagged}  |  leave untagged: ${untagged}`);
  console.log('by tech:', JSON.stringify(counts, null, 2));

  if (apply && ops.length) {
    const r = await Assignment.bulkWrite(ops);
    console.log(`APPLIED — modified ${r.modifiedCount}`);
  } else if (!apply) {
    console.log('(dry run — set APPLY=1 to write)');
  }
  await mongoose.disconnect();
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
