/**
 * Merge Batch 1 into the Golden Bank blueprint, and prove the merge did nothing else.
 *
 * READ-ONLY WITH RESPECT TO THE DATABASE — it imports no database client, so there is no
 * connection for it to write through. It writes two CSVs and reads three.
 *
 * THE 28 UNTOUCHED SKILLS ARE VERIFIED, NOT ASSUMED. A merge that rewrote a scaffold row would
 * be invisible: the file would still have the right shape and the right skill keys, and the loss
 * would surface weeks later as a skill nobody could remember deciding about. So the rows for
 * skills outside Batch 1 are compared field by field against the scaffold they came from.
 *
 * THE SKILL ORDER IS THE CURRICULUM'S. Batch-1 rows are placed where their skill already sat, so
 * the file continues to read in the sequence a student meets the material rather than in the
 * order batches happened to be authored.
 *
 *   npx ts-node src/scripts/foundationGoldenBankBatch1.ts
 */

import fs from 'fs';
import path from 'path';
import { FOUNDATION_BATCH1, BATCH1_SKILLS, BlueprintRow } from '../data/goldenBank/foundationBatch1';

const ROOT = path.join(__dirname, '../../..');
const REGISTRY_IN = path.join(ROOT, 'docs/audit/foundation-golden-bank-skill-registry.csv');
const BLUEPRINT = path.join(ROOT, 'docs/audit/foundation-golden-bank-blueprint.csv');
const REVIEW_OUT = path.join(ROOT, 'docs/audit/foundation-golden-bank-blueprint-batch1-review.csv');

const HEADER = [
  'skillKey', 'skillName', 'conceptId', 'conceptName', 'factId', 'factStatement',
  'familyId', 'familyName', 'measurementObjective', 'allowedDifficultyMin',
  'allowedDifficultyMax', 'cognitiveLevel', 'questionType', 'distractorStrategy',
  'reassessmentGroup', 'notes',
];

function readCsv(file: string): { header: string[]; rows: Record<string, string>[] } {
  const text = fs.readFileSync(file, 'utf8');
  const records: string[][] = [];
  let row: string[] = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\r') { /* with the \n */ }
    else if (c === '\n') { row.push(cur); records.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur.length || row.length) { row.push(cur); records.push(row); }
  const clean = records.filter(r => r.length > 1 || (r[0] ?? '').trim() !== '');
  const header = clean[0];
  return { header, rows: clean.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? '']))) };
}

const cell = (v: any) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const writeCsv = (file: string, header: string[], rows: Record<string, any>[]) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    [header.join(','), ...rows.map(r => header.map(h => cell(r[h])).join(','))].join('\n') + '\n',
    'utf8',
  );
};

(async () => {
  const registry = readCsv(REGISTRY_IN);
  const scaffold = readCsv(BLUEPRINT);

  const nameByKey = new Map<string, string>(
    registry.rows.map(r => [r.skillKey, r.skillName]),
  );
  const skillOrder = registry.rows.map(r => r.skillKey);

  /** Scaffold rows for skills this batch does not touch, kept exactly as they are. */
  const untouched = scaffold.rows.filter(r => !BATCH1_SKILLS.includes(r.skillKey));

  const batchRows = FOUNDATION_BATCH1.map((r: BlueprintRow) => ({
    ...r,
    skillName: nameByKey.get(r.skillKey) || r.skillKey,
  }));

  // Rebuilt in registry order so the file keeps reading as the curriculum runs.
  const merged: Record<string, any>[] = [];
  for (const key of skillOrder) {
    if (BATCH1_SKILLS.includes(key)) merged.push(...batchRows.filter(r => r.skillKey === key));
    else merged.push(...untouched.filter(r => r.skillKey === key));
  }

  writeCsv(BLUEPRINT, HEADER, merged);
  writeCsv(REVIEW_OUT, HEADER, batchRows);

  /* ---- validation --------------------------------------------------------------------- */

  const reread = readCsv(BLUEPRINT);
  const batch = reread.rows.filter(r => BATCH1_SKILLS.includes(r.skillKey));
  const rest = reread.rows.filter(r => !BATCH1_SKILLS.includes(r.skillKey));

  const drifted: string[] = [];
  for (const before of untouched) {
    const after = rest.find(r => r.skillKey === before.skillKey);
    if (!after) { drifted.push(`${before.skillKey} lost from the blueprint`); continue; }
    for (const h of HEADER) {
      if ((before[h] ?? '') !== (after[h] ?? '')) drifted.push(`${before.skillKey} field "${h}" changed`);
    }
  }

  const dup = (vals: string[]) => {
    const seen = new Set<string>(), dups = new Set<string>();
    for (const v of vals) { if (seen.has(v)) dups.add(v); seen.add(v); }
    return [...dups];
  };
  const dupFacts = dup(batch.map(r => r.factId));
  const dupFamilies = dup(batch.map(r => r.familyId));
  const blankFacts = batch.filter(r => !r.factStatement.trim()).length;
  const blankObjectives = batch.filter(r => !r.measurementObjective.trim()).length;
  const blankDistractors = batch.filter(r => !r.distractorStrategy.trim()).length;

  console.log('\nGOLDEN BANK BLUEPRINT — BATCH 1\n');
  console.log(`${'skill'.padEnd(30)}${'rows'.padStart(5)}${'concepts'.padStart(10)}${'facts'.padStart(7)}`
    + `${'families'.padStart(10)}${'groups'.padStart(8)}   difficulty span`);
  console.log('-'.repeat(96));
  for (const key of BATCH1_SKILLS) {
    const mine = batch.filter(r => r.skillKey === key);
    const concepts = new Set(mine.map(r => r.conceptId)).size;
    const facts = new Set(mine.map(r => r.factId)).size;
    const families = new Set(mine.map(r => r.familyId)).size;
    const groups = new Set(mine.map(r => r.reassessmentGroup)).size;
    // Which of D1..D5 at least one family in this skill can be asked at.
    const levels = [1, 2, 3, 4, 5].filter(d => mine.some(r =>
      Number(r.allowedDifficultyMin.slice(1)) <= d && Number(r.allowedDifficultyMax.slice(1)) >= d));
    console.log(`${key.padEnd(30)}${String(mine.length).padStart(5)}${String(concepts).padStart(10)}`
      + `${String(facts).padStart(7)}${String(families).padStart(10)}${String(groups).padStart(8)}`
      + `   ${levels.map(d => `D${d}`).join(' ')}`);
  }
  console.log('-'.repeat(96));

  const cog = new Map<string, number>();
  for (const r of batch) cog.set(r.cognitiveLevel, (cog.get(r.cognitiveLevel) || 0) + 1);

  console.log(`\nBatch-1 skills                   : ${new Set(batch.map(r => r.skillKey)).size}`);
  console.log(`Batch-1 rows                     : ${batch.length}`);
  console.log(`duplicate factIds                : ${dupFacts.length}${dupFacts.length ? ' — ' + dupFacts.join(', ') : ''}`);
  console.log(`duplicate familyIds              : ${dupFamilies.length}${dupFamilies.length ? ' — ' + dupFamilies.join(', ') : ''}`);
  console.log(`blank factStatements             : ${blankFacts}`);
  console.log(`blank measurementObjectives      : ${blankObjectives}`);
  console.log(`blank distractorStrategies       : ${blankDistractors}`);
  console.log(`cognitive spread                 : `
    + ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE'].map(l => `${l} ${cog.get(l) || 0}`).join(', '));
  console.log(`untouched scaffold skills        : ${rest.length} (expected ${untouched.length})`);
  console.log(`untouched rows changed           : ${drifted.length}`);
  console.log(`database writes                  : 0  (no database client is imported)`);
  console.log(`assessment questions generated   : 0  (this file describes measurements, not items)`);

  if (drifted.length) {
    console.log('\n⚠ UNTOUCHED ROWS CHANGED:');
    for (const d of drifted.slice(0, 10)) console.log(`  ${d}`);
  }

  const problems: string[] = [];
  if (new Set(batch.map(r => r.skillKey)).size !== 5) problems.push('Batch-1 skill count is not 5');
  if (rest.length !== untouched.length) problems.push('a scaffold row for an untouched skill was lost or added');
  if (dupFacts.length) problems.push(`${dupFacts.length} duplicate factId(s)`);
  if (dupFamilies.length) problems.push(`${dupFamilies.length} duplicate familyId(s)`);
  if (blankFacts || blankObjectives || blankDistractors) problems.push('a required Batch-1 field is blank');
  if (drifted.length) problems.push(`${drifted.length} untouched field(s) changed`);
  if (reread.rows.length !== batch.length + rest.length) problems.push('row accounting does not add up');

  console.log(problems.length
    ? `\n⚠ VALIDATION FAILED:\n  ${problems.join('\n  ')}`
    : '\n✅ validated: 5 skills populated, 28 scaffold rows untouched, no duplicate ids, no blanks');

  console.log(`\nwritten: ${path.relative(ROOT, BLUEPRINT).replace(/\\/g, '/')}`);
  console.log(`written: ${path.relative(ROOT, REVIEW_OUT).replace(/\\/g, '/')}`);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
