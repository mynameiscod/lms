/**
 * The Foundation question bank exactly as stored, for Golden Bank analysis.
 *
 * READ-ONLY. Two CSVs are written; nothing in the database is touched, remapped or generated.
 *
 * REACHABILITY IS THE DEFINITION OF "IN THE BANK". A question exists in the collection; a question
 * the generator can ASK is one an active PRIMARY SkillEvidence row points at, for a skill this
 * stage covers. Those are different sets, and the difference is exactly what has bitten this
 * product repeatedly — a bank can look full while the paper comes up short. So the export walks
 * the mappings, not the collection, and one row is one (question, PRIMARY skill) pair.
 *
 * NOTHING IS INFERRED. Difficulty is reported in the vocabulary it is stored in. This content
 * keeps `difficultyLevel` as easy/medium/hard and has no numeric `difficulty` at all, so the
 * requested difficulty1..5 columns are present and honestly zero, with the word bands carried
 * alongside them. Mapping "medium" onto 3 would be inventing a value the bank does not hold, and
 * a Golden Bank blueprint built on invented numbers would be calibrated against nothing.
 *
 * SECONDARY MAPPINGS ARE NOT EXPORTED. They are real evidence at quarter weight, but a skill
 * measured only in passing is not measured, and the floor counts PRIMARY alone.
 *
 *   npx ts-node src/scripts/foundationQuestionBankExport.ts <tenantId> [--stage=foundation]
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CareerSkill from '../models/CareerSkill';
import SkillEvidence from '../models/SkillEvidence';
import AssessmentItem from '../models/AssessmentItem';

dotenv.config();

const ROOT = path.join(__dirname, '../../..');
const REGISTRY_IN = path.join(ROOT, 'docs/audit/foundation-golden-bank-skill-registry.csv');
const BANK_OUT = path.join(ROOT, 'docs/audit/foundation-existing-366-question-bank.csv');
const SUMMARY_OUT = path.join(ROOT, 'docs/audit/foundation-existing-question-summary.csv');

const csvCell = (v: any) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const writeCsv = (file: string, header: string[], rows: any[]) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    [header.join(','), ...rows.map(r => header.map(h => csvCell(r[h])).join(','))].join('\n') + '\n',
    'utf8',
  );
};

function readCsv(file: string): Record<string, string>[] {
  const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
  const head = lines[0].split(',');
  return lines.slice(1).map(line => {
    const cells: string[] = [];
    let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') q = false;
        else cur += c;
      } else if (c === '"') q = true;
      else if (c === ',') { cells.push(cur); cur = ''; }
      else cur += c;
    }
    cells.push(cur);
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']));
  });
}

/** Case and whitespace only. Not semantic — that is a later, deliberate decision. */
const normalise = (s: string) => String(s ?? '').toLowerCase().replace(/\s+/g, ' ').trim();

(async () => {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error('Usage: foundationQuestionBankExport.ts <tenantId> [--stage=foundation]');
    process.exit(1);
  }
  if (!fs.existsSync(REGISTRY_IN)) {
    console.error(`Registry missing: ${REGISTRY_IN}. Run foundationGoldenBankRegistry.ts first.`);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  const db = mongoose.connection.db;

  const registry = readCsv(REGISTRY_IN);
  const registryKeys = registry.map(r => String(r.skillKey).toUpperCase());
  const registryCount = new Map<string, number>(
    registry.map(r => [String(r.skillKey).toUpperCase(), Number(r.currentPrimaryItems)]),
  );
  const registryName = new Map<string, string>(
    registry.map(r => [String(r.skillKey).toUpperCase(), r.skillName]),
  );

  const skillDocs = await CareerSkill.find({ key: { $in: registryKeys } }).select('key name').lean() as any[];
  const nameByKey = new Map<string, string>(skillDocs.map(s => [String(s.key).toUpperCase(), s.name]));

  const mappings = await SkillEvidence.find({
    tenantId, active: true, contribution: 'PRIMARY', skillKey: { $in: registryKeys },
  }).select('skillKey sourceType sourceId contribution').lean() as any[];

  /* ---- load the content the mappings point at ------------------------------------------ */

  const qIds = [...new Set(mappings.filter(m => m.sourceType === 'question').map(m => String(m.sourceId)))]
    .filter(id => mongoose.Types.ObjectId.isValid(id))
    .map(id => new mongoose.Types.ObjectId(id));
  const aIds = [...new Set(mappings.filter(m => m.sourceType === 'assessment_item').map(m => String(m.sourceId)))];

  const questions = qIds.length
    ? await db.collection('questions').find({ _id: { $in: qIds } }).toArray()
    : [];
  const items = aIds.length
    ? await AssessmentItem.find({ _id: { $in: aIds } }).lean() as any[]
    : [];

  const qByends = new Map<string, any>(questions.map(q => [String(q._id), q]));
  const iById = new Map<string, any>(items.map(i => [String(i._id), i]));

  const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
  const rows: any[] = [];
  let orphaned = 0;

  for (const m of mappings) {
    const id = String(m.sourceId);
    const isQuestion = m.sourceType === 'question';
    const doc = isQuestion ? qByends.get(id) : iById.get(id);

    // A mapping whose content is gone is counted and named, never emitted as a hollow row.
    if (!doc) { orphaned++; continue; }

    const key = String(m.skillKey).toUpperCase();
    const opts: { text: string; correct: boolean }[] = isQuestion
      ? (doc.options || []).map((o: any) => ({ text: String(o.text ?? ''), correct: !!o.isCorrect }))
      : (doc.options || []).map((o: any) => ({
        text: String(o.text ?? ''), correct: (doc.correctOptionIds || []).includes(o.id),
      }));

    const correctIndex = opts.findIndex(o => o.correct);

    rows.push({
      questionId: id,
      sourceType: m.sourceType,
      sourceId: id,
      skillKey: key,
      skillName: nameByKey.get(key) || registryName.get(key) || key,
      prompt: isQuestion ? doc.question : doc.prompt,
      optionA: opts[0]?.text ?? '',
      optionB: opts[1]?.text ?? '',
      optionC: opts[2]?.text ?? '',
      optionD: opts[3]?.text ?? '',
      correctOption: correctIndex >= 0 ? LETTERS[correctIndex] : '',
      correctAnswerText: isQuestion
        ? (doc.correctAnswerText ?? (correctIndex >= 0 ? opts[correctIndex].text : ''))
        : (correctIndex >= 0 ? opts[correctIndex].text : ''),
      // As stored, in the vocabulary it is stored in. See the header note.
      difficulty: isQuestion ? (doc.difficultyLevel ?? '') : (doc.difficulty ?? ''),
      difficultyWord: isQuestion ? (doc.difficultyLevel ?? '') : '',
      difficultyNumeric: isQuestion ? '' : (doc.difficulty ?? ''),
      factKeys: (doc.factKeys || []).join(' | '),
      tags: (doc.tags || []).filter(Boolean).join(' | '),
      // `questions` carries no active flag at all; AssessmentItem does. Reported as stored
      // rather than defaulted to true, so an absent flag is visible as absent.
      active: isQuestion ? (doc.active === undefined ? '' : String(doc.active)) : String(doc.active !== false),
      contribution: m.contribution,
      questionType: doc.type ?? '',
      marks: doc.marks ?? doc.points ?? '',
      subject: doc.subject ?? doc.dimension ?? '',
      description: doc.description ?? '',
      explanation: doc.explanation ?? '',
      codeSnippet: doc.codeSnippet ?? '',
      expectedOutput: doc.expectedOutput ?? '',
      source: doc.source ?? doc.createdBy ?? '',
    });
  }

  const BANK_HEADER = [
    'questionId', 'sourceType', 'sourceId', 'skillKey', 'skillName', 'prompt',
    'optionA', 'optionB', 'optionC', 'optionD', 'correctOption', 'correctAnswerText',
    'difficulty', 'difficultyWord', 'difficultyNumeric', 'factKeys', 'tags', 'active',
    'contribution', 'questionType', 'marks', 'subject', 'description', 'explanation',
    'codeSnippet', 'expectedOutput', 'source',
  ];
  writeCsv(BANK_OUT, BANK_HEADER, rows);

  /* ---- per-skill summary --------------------------------------------------------------- */

  const summary = registryKeys.map(key => {
    const mine = rows.filter(r => r.skillKey === key);
    const band = (w: string) => mine.filter(r => normalise(r.difficultyWord) === w).length;
    return {
      skillKey: key,
      skillName: nameByKey.get(key) || registryName.get(key) || key,
      activePrimaryQuestions: mine.length,
      // Present because they were asked for, and zero because no document stores a numeric
      // difficulty. The word bands below carry this bank's actual distribution.
      difficulty1Count: mine.filter(r => String(r.difficultyNumeric) === '1').length,
      difficulty2Count: mine.filter(r => String(r.difficultyNumeric) === '2').length,
      difficulty3Count: mine.filter(r => String(r.difficultyNumeric) === '3').length,
      difficulty4Count: mine.filter(r => String(r.difficultyNumeric) === '4').length,
      difficulty5Count: mine.filter(r => String(r.difficultyNumeric) === '5').length,
      easyCount: band('easy'),
      mediumCount: band('medium'),
      hardCount: band('hard'),
      questionsWithFactKeys: mine.filter(r => r.factKeys).length,
      questionsWithoutFactKeys: mine.filter(r => !r.factKeys).length,
    };
  });

  writeCsv(SUMMARY_OUT, [
    'skillKey', 'skillName', 'activePrimaryQuestions',
    'difficulty1Count', 'difficulty2Count', 'difficulty3Count', 'difficulty4Count', 'difficulty5Count',
    'easyCount', 'mediumCount', 'hardCount',
    'questionsWithFactKeys', 'questionsWithoutFactKeys',
  ], summary);

  /* ---- structural checks --------------------------------------------------------------- */

  const count = (arr: any[]) => arr.length;
  const groups = <T>(list: T[], keyOf: (t: T) => string) => {
    const m = new Map<string, T[]>();
    for (const x of list) {
      const k = keyOf(x);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(x);
    }
    return [...m.values()].filter(g => g.length > 1);
  };

  const exactDupGroups = groups(rows, r => String(r.prompt));
  const normDupGroups = groups(rows, r => normalise(r.prompt));
  const mcqDupGroups = groups(rows, r =>
    `${normalise(r.prompt)}||${[r.optionA, r.optionB, r.optionC, r.optionD].map(normalise).sort().join('~')}||${normalise(r.correctAnswerText)}`);

  const dupRows = (gs: any[][]) => gs.reduce((n, g) => n + (g.length - 1), 0);

  /**
   * Option uniqueness is compared CASE-SENSITIVELY, unlike prompt duplication.
   *
   * Lowercasing first reported a false positive and it is worth naming: a Python question about
   * `.lower()` offers HI / hi / Hi / Error, where the case IS the answer. Folding case collapsed
   * three correct-by-construction options into one and accused a perfectly good question of
   * having duplicate choices. Whitespace still normalises — trailing spaces are never the point
   * of a question — but case never can, because for a case-sensitive language it is the content.
   */
  const thinOptions = rows.filter(r => {
    const set = new Set([r.optionA, r.optionB, r.optionC, r.optionD]
      .map(o => String(o ?? '').replace(/\s+/g, ' ').trim())
      .filter(Boolean));
    return set.size < 4;
  });
  const noCorrect = rows.filter(r => !r.correctOption || !String(r.correctAnswerText).trim());
  const noDifficulty = rows.filter(r => !String(r.difficulty).trim());
  const blanks = rows.filter(r =>
    /_{3,}/.test(String(r.prompt)) || [r.optionA, r.optionB, r.optionC, r.optionD].some(o => /_{3,}/.test(String(o))));
  const withFacts = rows.filter(r => r.factKeys);

  console.log(`\nFOUNDATION QUESTION BANK — tenant ${tenantId}`);
  console.log(`reachable through active PRIMARY SkillEvidence for the 33 registry skills\n`);
  console.log(`total active PRIMARY questions          : ${count(rows)}`);
  console.log(`exact duplicate prompts                 : ${dupRows(exactDupGroups)} rows in ${exactDupGroups.length} groups`);
  console.log(`normalized duplicate prompts            : ${dupRows(normDupGroups)} rows in ${normDupGroups.length} groups`);
  console.log(`duplicate complete MCQs                 : ${dupRows(mcqDupGroups)} rows in ${mcqDupGroups.length} groups`);
  console.log(`questions with fewer than 4 unique opts : ${count(thinOptions)}`);
  console.log(`questions missing correct answers       : ${count(noCorrect)}`);
  console.log(`questions missing difficulty            : ${count(noDifficulty)}`);
  console.log(`questions containing blank placeholders : ${count(blanks)}`);
  console.log(`questions with factKeys                 : ${count(withFacts)}`);
  console.log(`questions without factKeys              : ${count(rows) - count(withFacts)}`);
  if (orphaned) console.log(`mappings whose content is missing        : ${orphaned}  <-- would inflate any count taken from mappings alone`);

  if (normDupGroups.length) {
    console.log('\nnormalized duplicate groups (first 5):');
    for (const g of normDupGroups.slice(0, 5)) {
      console.log(`  x${g.length}  [${g.map((r: any) => r.skillKey).join(', ')}]  ${String(g[0].prompt).slice(0, 90)}`);
    }
  }
  if (thinOptions.length) {
    console.log('\nfewer than 4 unique options (first 5):');
    for (const r of thinOptions.slice(0, 5)) console.log(`  ${r.skillKey}  ${String(r.prompt).slice(0, 80)}`);
  }

  /* ---- summary table + agreement with the registry ------------------------------------- */

  console.log('\nPER-SKILL SUMMARY (easy/medium/hard as stored)');
  console.log(`${'skillKey'.padEnd(30)}${'questions'.padStart(10)}${'easy'.padStart(6)}${'med'.padStart(5)}${'hard'.padStart(6)}`
    + `${'facts'.padStart(7)}${'registry'.padStart(10)}  agree`);
  console.log('-'.repeat(90));
  const mismatches: string[] = [];
  for (const s of summary) {
    const expected = registryCount.get(s.skillKey);
    const agree = expected === s.activePrimaryQuestions;
    if (!agree) mismatches.push(`${s.skillKey}: export ${s.activePrimaryQuestions}, registry ${expected}`);
    console.log(`${s.skillKey.padEnd(30)}${String(s.activePrimaryQuestions).padStart(10)}`
      + `${String(s.easyCount).padStart(6)}${String(s.mediumCount).padStart(5)}${String(s.hardCount).padStart(6)}`
      + `${String(s.questionsWithFactKeys).padStart(7)}${String(expected).padStart(10)}  ${agree ? 'yes' : 'NO'}`);
  }

  const totalEasy = summary.reduce((n, s) => n + s.easyCount, 0);
  const totalMed = summary.reduce((n, s) => n + s.mediumCount, 0);
  const totalHard = summary.reduce((n, s) => n + s.hardCount, 0);
  console.log('-'.repeat(90));
  console.log(`${'TOTAL'.padEnd(30)}${String(rows.length).padStart(10)}${String(totalEasy).padStart(6)}`
    + `${String(totalMed).padStart(5)}${String(totalHard).padStart(6)}${String(count(withFacts)).padStart(7)}`
    + `${String([...registryCount.values()].reduce((a, b) => a + b, 0)).padStart(10)}`);

  console.log(mismatches.length
    ? `\n⚠ MISMATCH against the registry — reported, not corrected:\n  ${mismatches.join('\n  ')}`
    : '\n✅ every per-skill count agrees exactly with the registry');

  console.log(`\nwritten: ${path.relative(ROOT, BANK_OUT).replace(/\\/g, '/')}`);
  console.log(`written: ${path.relative(ROOT, SUMMARY_OUT).replace(/\\/g, '/')}`);
  console.log('read-only: nothing modified, deleted, imported, generated or remapped.');
  await mongoose.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
