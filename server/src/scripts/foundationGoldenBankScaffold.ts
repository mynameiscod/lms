/**
 * The empty frames the Golden Bank will be authored into.
 *
 * READ-ONLY, AND IT NEVER OPENS THE DATABASE. Both outputs are derived from the two audit CSVs
 * already committed, so "no database writes" is not a promise this script makes and asks you to
 * trust — there is no connection for it to write through. Everything it knows came from files.
 *
 * TWO SCAFFOLDS, TWO DIRECTIONS OF WORK.
 *
 * The blueprint is top-down: what SHOULD be measured. One row per skill for now, with the
 * concept, fact and family columns deliberately empty. Filling them is the design decision this
 * file exists to hold, and pre-filling them with anything — a guess, a placeholder, a split
 * inferred from the questions that happen to exist — would quietly make that decision on the
 * designer's behalf and be indistinguishable from a considered one later.
 *
 * The classification is bottom-up: what EXISTS, and where each piece lands once the blueprint is
 * drawn. Every one of the 366 questions is carried across verbatim with seven empty columns
 * beside it.
 *
 * QUESTION TEXT IS COPIED, NEVER TOUCHED. Verified field by field against the source export
 * rather than assumed: a scaffold that silently retyped a prompt would corrupt the very thing
 * being classified, and the corruption would look like authoring.
 *
 *   npx ts-node src/scripts/foundationGoldenBankScaffold.ts
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '../../..');
const REGISTRY_IN = path.join(ROOT, 'docs/audit/foundation-golden-bank-skill-registry.csv');
const BANK_IN = path.join(ROOT, 'docs/audit/foundation-existing-366-question-bank.csv');
const BLUEPRINT_OUT = path.join(ROOT, 'docs/audit/foundation-golden-bank-blueprint.csv');
const CLASSIFY_OUT = path.join(ROOT, 'docs/audit/foundation-existing-question-classification.csv');

const EXPECTED_SKILLS = 33;
const EXPECTED_QUESTIONS = 366;

/**
 * RFC 4180 reader — quoted fields, escaped quotes, and newlines INSIDE a field.
 *
 * A line-based split would have worked on the registry and broken on the bank, where prompts
 * carrying code span several lines: the file is 444 lines and 366 records. Splitting on newlines
 * would have produced 78 mangled rows and a row count that looked plausible.
 */
function readCsv(file: string): { header: string[]; rows: Record<string, string>[] } {
  const text = fs.readFileSync(file, 'utf8');
  const records: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\r') { /* handled with the \n that follows */ }
    else if (c === '\n') { row.push(cur); records.push(row); row = []; cur = ''; }
    else cur += c;
  }
  // A file not ending in a newline still has a final record.
  if (cur.length || row.length) { row.push(cur); records.push(row); }

  const nonEmpty = records.filter(r => r.length > 1 || (r[0] ?? '').trim() !== '');
  const header = nonEmpty[0];
  return {
    header,
    rows: nonEmpty.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? '']))),
  };
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
  for (const f of [REGISTRY_IN, BANK_IN]) {
    if (!fs.existsSync(f)) {
      console.error(`Missing input: ${path.relative(ROOT, f)}`);
      console.error('Run foundationGoldenBankRegistry.ts and foundationQuestionBankExport.ts first.');
      process.exit(1);
    }
  }

  const registry = readCsv(REGISTRY_IN);
  const bank = readCsv(BANK_IN);

  /* ---- 1. the blueprint scaffold ------------------------------------------------------- */

  const BLUEPRINT_HEADER = [
    'skillKey', 'skillName', 'conceptId', 'conceptName', 'factId', 'factStatement',
    'familyId', 'familyName', 'measurementObjective', 'allowedDifficultyMin',
    'allowedDifficultyMax', 'cognitiveLevel', 'questionType', 'distractorStrategy',
    'reassessmentGroup', 'notes',
  ];

  /**
   * One row per skill, in the registry's order — which is curriculum order, so a designer
   * working down the file walks the year in the sequence a student meets it. Rows will be split
   * as concepts and families are decided; the skill is the only thing known now.
   */
  const blueprint = registry.rows.map(r => {
    const row: Record<string, string> = {};
    for (const h of BLUEPRINT_HEADER) row[h] = '';
    row.skillKey = r.skillKey;
    row.skillName = r.skillName;
    return row;
  });

  writeCsv(BLUEPRINT_OUT, BLUEPRINT_HEADER, blueprint);

  /* ---- 2. the classification scaffold -------------------------------------------------- */

  const NEW_COLUMNS = [
    'conceptId', 'factId', 'familyId', 'proposedDifficulty',
    'proposedCognitiveLevel', 'goldenDecision', 'reviewNotes',
  ];
  // Existing columns first, in their original order, so a diff against the source export shows
  // added columns and nothing else.
  const CLASSIFY_HEADER = [...bank.header, ...NEW_COLUMNS];

  const classification = bank.rows.map(r => {
    const row: Record<string, string> = { ...r };
    for (const c of NEW_COLUMNS) row[c] = '';
    return row;
  });

  writeCsv(CLASSIFY_OUT, CLASSIFY_HEADER, classification);

  /* ---- 3. verification ----------------------------------------------------------------- */

  const reread = readCsv(CLASSIFY_OUT);
  const rereadBlueprint = readCsv(BLUEPRINT_OUT);

  /**
   * Every carried field compared value by value against the source.
   *
   * Not a row count and not a checksum of the whole file — those would pass while a single
   * prompt lost a quote or a trailing space. The classification is the input to authoring, so a
   * silent character change here would propagate into the Golden Bank as though somebody meant
   * it.
   */
  const drifted: string[] = [];
  for (const [i, src] of bank.rows.entries()) {
    const out = reread.rows[i];
    if (!out) { drifted.push(`row ${i + 1} missing from the output`); continue; }
    for (const h of bank.header) {
      if ((src[h] ?? '') !== (out[h] ?? '')) {
        drifted.push(`row ${i + 1} (${src.questionId}) field "${h}" changed`);
      }
    }
  }

  const blanksIntact = reread.rows.every(r => NEW_COLUMNS.every(c => (r[c] ?? '') === ''));
  const blueprintBlanksIntact = rereadBlueprint.rows.every(r =>
    BLUEPRINT_HEADER.slice(2).every(c => (r[c] ?? '') === ''));
  const skillsMatch = new Set(rereadBlueprint.rows.map(r => r.skillKey)).size === rereadBlueprint.rows.length;

  console.log('\nGOLDEN BANK SCAFFOLD\n');
  console.log(`blueprint skills                 : ${rereadBlueprint.rows.length}  (expected ${EXPECTED_SKILLS})`);
  console.log(`blueprint skillKeys unique       : ${skillsMatch}`);
  console.log(`blueprint design columns empty   : ${blueprintBlanksIntact}`);
  console.log(`classification rows              : ${reread.rows.length}  (expected ${EXPECTED_QUESTIONS})`);
  console.log(`classification columns           : ${bank.header.length} carried + ${NEW_COLUMNS.length} new = ${CLASSIFY_HEADER.length}`);
  console.log(`new columns empty                : ${blanksIntact}`);
  console.log(`question text changes            : ${drifted.length}`);
  console.log(`database connections opened      : 0  (this script imports no database client)`);

  if (drifted.length) {
    console.log('\n⚠ CARRIED FIELDS CHANGED — reported, not corrected:');
    for (const d of drifted.slice(0, 10)) console.log(`  ${d}`);
    if (drifted.length > 10) console.log(`  … ${drifted.length - 10} more`);
  }

  const problems: string[] = [];
  if (rereadBlueprint.rows.length !== EXPECTED_SKILLS) {
    problems.push(`blueprint rows: expected ${EXPECTED_SKILLS}, wrote ${rereadBlueprint.rows.length}`);
  }
  if (reread.rows.length !== EXPECTED_QUESTIONS) {
    problems.push(`classification rows: expected ${EXPECTED_QUESTIONS}, wrote ${reread.rows.length}`);
  }
  if (!skillsMatch) problems.push('blueprint contains a duplicate skillKey');
  if (!blanksIntact) problems.push('a new classification column is not empty');
  if (!blueprintBlanksIntact) problems.push('a blueprint design column is not empty');
  if (drifted.length) problems.push(`${drifted.length} carried field(s) differ from the source export`);

  console.log(problems.length
    ? `\n⚠ VERIFICATION FAILED:\n  ${problems.join('\n  ')}`
    : '\n✅ verified: 33 blueprint skills, 366 classification rows, no text changed, no database touched');

  console.log(`\nwritten: ${path.relative(ROOT, BLUEPRINT_OUT).replace(/\\/g, '/')}`);
  console.log(`written: ${path.relative(ROOT, CLASSIFY_OUT).replace(/\\/g, '/')}`);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
