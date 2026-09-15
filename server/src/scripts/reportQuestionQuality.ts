/**
 * How gameable the authored question bank is, and which questions make it so.
 *
 * READ ONLY, and it needs no database: it reads the authored bundles directly, which is where
 * a question has to be fixed.
 *
 * ── THE MEASURE ───────────────────────────────────────────────────────────────────────────
 *
 * Not "is this question well written" — that needs a human. One specific, mechanical tell:
 * whether a student who never reads the material and always picks the LONGEST option scores
 * better than chance. Authors elaborate the correct answer and write the distractors quickly,
 * so length leaks the key, and students find that pattern long before they find the syllabus.
 *
 * It matters here more than in an ordinary question bank. Checkpoint questions feed
 * SkillEvidence through quizSkillBridge, and evidence feeds adaptive state. A bank with a tell
 * does not merely measure badly; it reports a guesser as strong, and the composer then builds
 * ninety days on that.
 *
 *   npx ts-node -T src/scripts/reportQuestionQuality.ts               the bank-level score
 *   npx ts-node -T src/scripts/reportQuestionQuality.ts --list        every question with a tell
 *   npx ts-node -T src/scripts/reportQuestionQuality.ts --list --unit=T_HTML_INTRO
 *   npx ts-node -T src/scripts/reportQuestionQuality.ts --checkpoint  only the graded ones
 */

import { ALL_BUNDLES } from '../seeds/careerPilot/allBundles';
import { PilotMcq } from '../seeds/careerPilot/pilotUnitContent';

interface Scored {
  unitCode: string;
  kind: 'practice' | 'checkpoint';
  q: PilotMcq;
  correctLen: number;
  longestDistractor: number;
  /** How much a guesser is credited for this question: 1 outright, a share when tied. */
  credit: number;
}

const scoreOne = (unitCode: string, kind: 'practice' | 'checkpoint', q: PilotMcq): Scored | null => {
  const opts = q.options || [];
  if (opts.length < 3) return null;
  const correct = opts.find(o => o.isCorrect);
  if (!correct) return null;
  const lens = opts.map(o => o.text.length);
  const max = Math.max(...lens);
  const others = opts.filter(o => !o.isCorrect).map(o => o.text.length);
  return {
    unitCode,
    kind,
    q,
    correctLen: correct.text.length,
    longestDistractor: Math.max(...others),
    credit: correct.text.length === max ? 1 / lens.filter(l => l === max).length : 0,
  };
};

const scored: Scored[] = [];
for (const b of ALL_BUNDLES) {
  for (const q of b.mcqs || []) { const s = scoreOne(b.unitCode, 'practice', q); if (s) scored.push(s); }
  for (const q of b.checkpoint || []) { const s = scoreOne(b.unitCode, 'checkpoint', q); if (s) scored.push(s); }
}

const wantUnit = (process.argv.find(a => a.startsWith('--unit=')) || '').replace('--unit=', '');
const onlyCheckpoint = process.argv.includes('--checkpoint');
const list = process.argv.includes('--list');

const pool = scored
  .filter(s => !onlyCheckpoint || s.kind === 'checkpoint')
  .filter(s => !wantUnit || s.unitCode === wantUnit);

const band = (rows: Scored[], label: string) => {
  if (!rows.length) return;
  const credit = rows.reduce((n, r) => n + r.credit, 0);
  const gaps = rows.map(r => r.correctLen - r.longestDistractor).sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];
  console.log(`  ${label.padEnd(12)} ${String(rows.length).padStart(4)} questions   ` +
    `longest-option strategy ${((credit / rows.length) * 100).toFixed(1).padStart(5)}%   ` +
    `median length advantage ${String(median).padStart(4)} chars`);
};

console.log('\nQUESTION BANK — ANSWER-LENGTH TELL');
console.log('-'.repeat(92));
band(pool.filter(s => s.kind === 'practice'), 'practice');
band(pool.filter(s => s.kind === 'checkpoint'), 'checkpoint');
band(pool, 'all');
console.log('-'.repeat(92));
console.log('  Chance is about 25%. A bank with no tell scores near that.');

if (list) {
  /* Worst first: the bigger the length advantage, the louder the tell. */
  const offenders = pool.filter(s => s.credit > 0)
    .sort((a, b) => (b.correctLen - b.longestDistractor) - (a.correctLen - a.longestDistractor));
  console.log(`\n${offenders.length} question(s) where the correct option is the longest\n`);
  for (const s of offenders) {
    console.log(`${s.unitCode}  [${s.kind}]  +${s.correctLen - s.longestDistractor}`);
    console.log(`  Q: ${s.q.question}`);
    for (const o of s.q.options) console.log(`  ${o.isCorrect ? '*' : ' '}(${String(o.text.length).padStart(3)}) ${o.text}`);
    console.log('');
  }
}

/* Per-unit roll-up, worst first, so a rewrite pass can be ordered. */
if (!list) {
  const byUnit = new Map<string, Scored[]>();
  for (const s of pool) byUnit.set(s.unitCode, [...(byUnit.get(s.unitCode) || []), s]);
  const rows = [...byUnit.entries()]
    .map(([u, rs]) => ({ u, n: rs.length, tell: rs.filter(r => r.credit > 0).length }))
    .filter(r => r.tell > 0)
    .sort((a, b) => b.tell - a.tell || a.u.localeCompare(b.u));
  console.log(`\n${rows.length} unit(s) carry at least one. Worst first:\n`);
  for (const r of rows.slice(0, 40)) console.log(`  ${r.u.padEnd(38)} ${r.tell}/${r.n}`);
  if (rows.length > 40) console.log(`  … ${rows.length - 40} more`);
}
