/**
 * Load a question bank from the authoring spreadsheet.
 *
 * WHAT IT WRITES. One Question per row, plus the SkillEvidence mapping that connects it to a
 * canonical skill. Both are needed: a question nothing maps to is invisible to the generator,
 * and a mapping with no question is worse than nothing — the generator counts it as available,
 * builds a paper around it and then finds nothing there.
 *
 * IDEMPOTENT ON Question_ID. Re-importing an edited sheet updates the same rows rather than
 * duplicating them, so fixing a typo in the spreadsheet is a re-run and not a cleanup.
 *
 * IT REFUSES ON AN UNKNOWN SKILL NAME rather than guessing. A category nobody has mapped would
 * otherwise be silently dropped — the import would report success, the questions would not be
 * there, and the only symptom would be a thin paper weeks later. Add the name to
 * questionBankSkillMap and run again.
 *
 * WHAT IT DELIBERATELY SKIPS. Self-report profile questions, and anything that cannot be
 * auto-marked. Both are reported by name and count, never dropped quietly.
 *
 *   npx ts-node src/scripts/importQuestionBankXlsx.ts <tenantId> "<path.xlsx>"
 *   npx ts-node src/scripts/importQuestionBankXlsx.ts <tenantId> "<path.xlsx>" --apply
 */

import fs from 'fs';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import CareerSkill from '../models/CareerSkill';
import SkillEvidence from '../models/SkillEvidence';
import { SKILL_NAME_TO_KEY, DIFFICULTY_MAP, GRADABLE_TYPES } from '../seeds/careerPilot/data/questionBankSkillMap';

dotenv.config();

const SHEET = 'Question_Bank';
const CREATED_BY = 'question-bank-import';

interface Row {
  Question_ID: string; Section: string; Topic: string; Subtopic: string;
  Difficulty: string; Question_Type: string; Question: string;
  Option_A: string; Option_B: string; Option_C: string; Option_D: string;
  Correct_Answer: string; Explanation: string; Skill_Measured: string;
  Curriculum_Module_Map: string; Routing_Tag: string; Scored: string; Variant_Group: string;
}

const clean = (v: any) => String(v ?? '').trim();

(async () => {
  const tenantId = process.argv[2];
  const file = process.argv[3];
  const apply = process.argv.includes('--apply');

  if (!tenantId || !file) {
    console.error('Usage: importQuestionBankXlsx.ts <tenantId> "<path.xlsx>" [--apply]');
    process.exit(1);
  }
  if (!fs.existsSync(file)) {
    console.error(`No such file: ${file}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(file);
  const ws = wb.Sheets[SHEET];
  if (!ws) {
    console.error(`No "${SHEET}" tab. Found: ${wb.SheetNames.join(', ')}`);
    process.exit(1);
  }
  const rows = XLSX.utils.sheet_to_json<Row>(ws, { defval: '' });
  console.log(`\n${rows.length} rows in ${SHEET}`);

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  /**
   * Every unknown skill name, gathered before anything is written.
   *
   * Reported together rather than one at a time: whoever fixes this is editing one map file,
   * and finding out about a second missing name only after re-running is needless.
   */
  const unknownNames = new Set<string>();
  for (const r of rows) {
    const name = clean(r.Skill_Measured);
    if (name && !(name in SKILL_NAME_TO_KEY)) unknownNames.add(name);
  }
  if (unknownNames.size) {
    console.error(`\nREFUSED — ${unknownNames.size} skill names are not mapped:`);
    for (const n of unknownNames) console.error(`  "${n}"`);
    console.error('\nAdd them to src/seeds/careerPilot/data/questionBankSkillMap.ts and run again.');
    await mongoose.disconnect();
    process.exit(1);
  }

  // Only skills that exist and can be measured. A mapping to a retired skill is dead weight.
  const wantedKeys = [...new Set(Object.values(SKILL_NAME_TO_KEY).filter(Boolean) as string[])];
  const live = await CareerSkill.find({
    key: { $in: wantedKeys }, active: true, assessable: true, nodeType: { $ne: 'GROUP' },
  }).select('key').lean() as any[];
  const liveKeys = new Set(live.map(s => String(s.key).toUpperCase()));

  const missingSkills = wantedKeys.filter(k => !liveKeys.has(k));
  if (missingSkills.length) {
    console.log(`\nnote — ${missingSkills.length} mapped skills are not active here, their questions are skipped:`);
    console.log('  ' + missingSkills.join(', '));
  }

  const db = mongoose.connection;
  const questionOps: any[] = [];
  const mappingOps: any[] = [];
  const skipped = { profile: 0, ungradable: 0, noOptions: 0, inactiveSkill: 0, noAnswer: 0 };
  const perSkill = new Map<string, { easy: number; medium: number; hard: number }>();

  for (const r of rows) {
    const name = clean(r.Skill_Measured);
    const skillKey = SKILL_NAME_TO_KEY[name];

    // Self-report and rubric-graded rows: asked, never scored. See the map for why.
    if (skillKey === null) { skipped.profile++; continue; }
    if (!GRADABLE_TYPES.has(clean(r.Question_Type))) { skipped.ungradable++; continue; }
    if (clean(r.Scored).toLowerCase() === 'no') { skipped.profile++; continue; }
    if (!liveKeys.has(skillKey!)) { skipped.inactiveSkill++; continue; }

    const options = [r.Option_A, r.Option_B, r.Option_C, r.Option_D].map(clean).filter(Boolean);
    if (options.length < 2) { skipped.noOptions++; continue; }

    /**
     * The correct answer is matched by TEXT, because that is what the sheet carries.
     *
     * A row whose answer does not appear among its own options is a typo in the bank, not a
     * question with no answer — importing it would create something a student can only get
     * wrong. Counted and skipped so it can be fixed.
     */
    const correct = clean(r.Correct_Answer);
    const correctIndex = options.findIndex(o => o.toLowerCase() === correct.toLowerCase());
    if (correctIndex < 0) { skipped.noAnswer++; continue; }

    const difficultyLevel = DIFFICULTY_MAP[clean(r.Difficulty)] || 'medium';
    const questionId = clean(r.Question_ID);

    const bucket = perSkill.get(skillKey!) || { easy: 0, medium: 0, hard: 0 };
    bucket[difficultyLevel]++;
    perSkill.set(skillKey!, bucket);

    /**
     * A deterministic _id from Question_ID.
     *
     * The mapping points at a question by id, so the two must agree — and re-importing must
     * update the same row rather than creating a second copy that nothing maps to. Deriving the
     * id from the author's own identifier gives both properties for free.
     */
    const _id = deterministicId(`${tenantId}:${questionId}`);

    questionOps.push({
      updateOne: {
        filter: { _id },
        update: {
          $set: {
            _id, tenantId, createdBy: CREATED_BY,
            type: 'mcq_single',
            question: clean(r.Question),
            description: clean(r.Explanation) || undefined,
            options: options.map(text => ({ text, isCorrect: text.toLowerCase() === correct.toLowerCase() })),
            correctAnswers: [options[correctIndex]],
            correctAnswerText: options[correctIndex],
            marks: 1,
            difficultyLevel,
            explanation: clean(r.Explanation),
            subject: clean(r.Section),
            tags: [clean(r.Topic), clean(r.Subtopic), clean(r.Routing_Tag)].filter(Boolean),
            source: 'question-bank-xlsx',
            updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        upsert: true,
      },
    });

    mappingOps.push({
      updateOne: {
        filter: { sourceType: 'question', sourceId: String(_id), skillKey: skillKey! },
        update: {
          $set: {
            tenantId, sourceType: 'question', sourceId: String(_id),
            skillKey: skillKey!, contribution: 'PRIMARY', active: true,
            // No audience narrowing: this bank is written for the foundation stage, and
            // year-tagging it would exclude the very students it is for.
            audienceRoles: [], audienceYears: [], audienceCourses: [], audienceBranches: [],
            updatedBy: CREATED_BY, updatedAt: new Date(),
          },
          $setOnInsert: { createdAt: new Date() },
        },
        upsert: true,
      },
    });
  }

  console.log(`\nwill import : ${questionOps.length} questions`);
  console.log(`skipped     : profile/self-report ${skipped.profile}, not auto-markable ${skipped.ungradable}, `
    + `too few options ${skipped.noOptions}, answer not among options ${skipped.noAnswer}, inactive skill ${skipped.inactiveSkill}`);

  console.log('\ncoverage per skill (easy/medium/hard):');
  for (const [k, v] of [...perSkill.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const total = v.easy + v.medium + v.hard;
    console.log(`  ${k.padEnd(30)} ${String(total).padStart(3)}   ${v.easy}/${v.medium}/${v.hard}`
      + (total < 2 ? '   <-- too few to hold a slot' : ''));
  }

  const uncovered = [...liveKeys].filter(k => !perSkill.has(k));
  if (uncovered.length) {
    console.log(`\nactive skills with NO questions in this bank (${uncovered.length}):`);
    console.log('  ' + uncovered.join(', '));
  }

  if (!apply) {
    console.log('\nDRY RUN — nothing written. Pass --apply to import.');
    await mongoose.disconnect();
    return;
  }

  // Questions first: a question nothing maps to is invisible; a mapping with no question misleads.
  const q = await db.collection('questions').bulkWrite(questionOps, { ordered: false });
  const m = await SkillEvidence.bulkWrite(mappingOps, { ordered: false });
  console.log(`\n✅ questions: ${q.upsertedCount} new, ${q.modifiedCount} updated`);
  console.log(`✅ mappings : ${m.upsertedCount} new, ${m.modifiedCount} updated`);
  console.log('\nNext — re-align the stage set so the paper draws on what now exists:');
  console.log(`  npx ts-node src/seeds/careerPilot/alignStageSetToCurriculum.ts ${tenantId} --apply`);

  await mongoose.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });

/** A stable ObjectId for an author's own identifier, so re-imports land on the same row. */
function deterministicId(ref: string): mongoose.Types.ObjectId {
  let h1 = 0x811c9dc5, h2 = 0x01000193, h3 = 0x9e3779b9;
  for (let i = 0; i < ref.length; i++) {
    const c = ref.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = Math.imul(h2 + c, 2654435761) >>> 0;
    h3 = Math.imul(h3 ^ (c + i), 40503) >>> 0;
  }
  return new mongoose.Types.ObjectId(
    [h1, h2, h3].map(n => n.toString(16).padStart(8, '0')).join('').slice(0, 24),
  );
}
