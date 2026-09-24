/**
 * Write the Year-2 golden bank out as the master CSV the importer reads.
 *
 * ── WHY A CSV AT ALL, WHEN THE BANK IS ALREADY TYPESCRIPT ─────────────────────────────────
 *
 * Because Year 1's is, and the importer is the piece worth reusing rather than reimplementing.
 * It already validates every row, refuses on any blocking problem, computes a stable ObjectId
 * per question so reruns update rather than duplicate, and writes the AssessmentItem and the
 * SkillEvidence mapping together. Emitting a CSV costs one file; a second importer would cost
 * a second set of the same decisions, drifting apart from the first the moment either changes.
 *
 * The CSV is a build artefact. The TypeScript is the source: edit `year2Bank/*.ts`, re-run this,
 * re-run the importer. Editing the CSV by hand works exactly once, until the next emit.
 *
 * ── THE OPTION ORDER IS DECIDED HERE, NOT IN THE SOURCE ───────────────────────────────────
 *
 * Every authored item holds its correct answer at index 0, deliberately: an author tracking
 * four shifting indices across three hundred questions makes mistakes, and a mistake here is a
 * question that marks the wrong answer right. So the source keeps the invariant and `present()`
 * does the shuffling, seeded on the questionId — the same question therefore lands in the same
 * position on every emit, which is what makes this file's output diffable.
 *
 *   npx ts-node src/scripts/emitYear2GoldenBank.ts            # writes, printing the tally
 *   npx ts-node src/scripts/emitYear2GoldenBank.ts --check    # verifies the file is current
 *
 * --check is for CI and for the moment before an import: it re-emits in memory, compares, and
 * exits non-zero if the CSV on disk no longer matches the bank it claims to hold.
 */

import fs from 'fs';
import path from 'path';
import { YEAR2_BANK } from '../data/goldenBank/year2Bank';
import { present } from '../data/goldenBank/year2Bank/present';

const OUT = path.join(__dirname, '../../../docs/audit/year2-golden-bank-master.csv');

const HEADER = [
  'questionId', 'skillKey', 'conceptId', 'factId', 'familyId', 'reassessmentGroup',
  'difficulty', 'cognitiveLevel', 'questionType', 'prompt',
  'optionA', 'optionB', 'optionC', 'optionD',
  'correctOption', 'correctAnswerText', 'explanation', 'provenance', 'sourceQuestionId',
];

/** RFC4180: quote when the field holds a comma, a quote or a newline; double any quote inside. */
const cell = (v: string): string =>
  /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;

function emit(): string {
  const lines = [HEADER.join(',')];

  for (const item of YEAR2_BANK) {
    const p = present(item);
    lines.push([
      item.questionId,
      item.skillKey,
      item.conceptId,
      item.factId,
      item.familyId,
      item.reassessmentGroup,
      item.difficulty,
      item.cognitiveLevel,
      'mcq',
      item.prompt,
      p.options[0], p.options[1], p.options[2], p.options[3],
      p.correctLetter,
      p.correctText,
      item.explanation,
      // Every Year-2 item is written from scratch. Nothing was kept, rewritten or remapped from
      // the Year-1 bank, so there is no legacy question for the importer to retire — which is
      // why a Year-2 import touches no existing mapping at all.
      'AUTHORED',
      '',
    ].map(v => cell(String(v ?? ''))).join(','));
  }

  return lines.join('\n') + '\n';
}

const csv = emit();
const check = process.argv.includes('--check');

if (check) {
  if (!fs.existsSync(OUT)) {
    console.error(`MISSING — ${OUT} has never been emitted.`);
    process.exit(1);
  }
  const onDisk = fs.readFileSync(OUT, 'utf8');
  if (onDisk !== csv) {
    console.error('STALE — the CSV does not match the bank. Re-run without --check.');
    process.exit(1);
  }
  console.log(`CURRENT — ${YEAR2_BANK.length} rows, matching the bank.`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, csv, 'utf8');

const bySkill = new Map<string, number>();
const byBand = new Map<string, number>();
const byPosition = new Map<string, number>();
for (const item of YEAR2_BANK) {
  bySkill.set(item.skillKey, (bySkill.get(item.skillKey) || 0) + 1);
  byBand.set(item.difficulty, (byBand.get(item.difficulty) || 0) + 1);
  const L = present(item).correctLetter;
  byPosition.set(L, (byPosition.get(L) || 0) + 1);
}

console.log(`\nYEAR-2 GOLDEN BANK EMITTED`);
console.log(`  ${OUT}`);
console.log(`  ${YEAR2_BANK.length} rows across ${bySkill.size} skills\n`);
for (const [k, n] of [...bySkill].sort()) console.log(`  ${k.padEnd(20)} ${n}`);
console.log('');
for (const b of ['D1', 'D2', 'D3', 'D4', 'D5']) {
  const n = Number(b.slice(1));
  console.log(`  ${b} -> difficulty ${n} -> ${n <= 2 ? 'EASY' : n === 3 ? 'MEDIUM' : 'HARD'}`
    + `${''.padEnd(6)}${byBand.get(b) || 0} rows`);
}
console.log('');
console.log('  correct answer position: '
  + ['A', 'B', 'C', 'D'].map(L => `${L} ${byPosition.get(L) || 0}`).join('   '));
