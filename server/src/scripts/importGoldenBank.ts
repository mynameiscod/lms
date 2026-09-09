/**
 * Import the frozen Foundation Golden Bank into a tenant's assessment content.
 *
 * DRY RUN BY DEFAULT. Nothing is written without --apply, and the dry run reports exactly what
 * the apply would do, counted from the same code path rather than estimated.
 *
 * ── WHERE THE ROWS GO, AND WHY NOT THE QUIZ BANK ──────────────────────────────────────────
 *
 * The architecture is untouched: CareerSkill -> SkillEvidence -> sourceType + sourceId ->
 * registered adapter. What this file decides is only which registered content family holds the
 * 1,650 questions, and it is `assessment_item` rather than `question`. Four things settle it,
 * and all four are properties of this repository rather than preferences:
 *
 *   1. Question.difficultyLevel is an enum of three values. The Golden bank is authored on a
 *      five-band scale where D4 is diagnosis and D5 is transfer, and those two bands are the
 *      whole point of the design. There is nowhere in the quiz bank to put them.
 *      AssessmentItem.difficulty is 1-5, and the registry already reads it as such.
 *
 *   2. The selector avoids spending several slots of one paper on one fact, and avoids re-asking
 *      at a retake what a student already answered, by reading `factKeys` off the loaded item.
 *      AssessmentItem has that field and the adapter surfaces it. Question has neither, so every
 *      Golden item would look unique to a machine that is trying to tell the same fact apart —
 *      and a student could be asked four questions from one family and told a skill was measured.
 *
 *   3. Question is the shared LMS quiz bank: quizzes compose from it, the admin question-bank
 *      screen lists it, usageCount and duplicate detection run over it. Putting 1,650 CareerPilot
 *      diagnostic items in there makes them selectable into ordinary college quizzes, and there
 *      is no `active` flag to retire one with — only deletion.
 *
 *   4. AssessmentItem is already handled end to end. gradeSubmittedAnswers has a branch for it,
 *      the admin bank screen renders it, stageCurriculumService and the coverage export read it.
 *      A NEW fifth source type would have looked cleaner — the registry says adding a family is
 *      one entry — but that is not true of the current code: the grader answers an unrecognised
 *      type with "unsupported content type", so a paper built from it would grade as ungradable.
 *
 * The tenant holds no AssessmentItems at all, which is a fact worth stating plainly: the earlier
 * generated bank was cleared for content quality, not because this was the wrong home for it.
 * The 366 surviving `question` mappings are hand-authored rows and are left exactly where they
 * are, except where one of them is the source of a Golden item — see below.
 *
 * ── D1-D5 AGAINST THE GENERATOR'S EASY/MEDIUM/HARD ────────────────────────────────────────
 *
 * Nothing is invented here. The generator asks its pools for EASY, MEDIUM or HARD, and the
 * registry normalises each family's own scale on read. For this family that is bandFromNumber,
 * which has always read 1-2 as EASY, 3 as MEDIUM and 4-5 as HARD. Writing D1-D5 as 1-5 therefore
 * lands on the existing mapping without a line of new code:
 *
 *      D1 -> 1 EASY      D2 -> 2 EASY      D3 -> 3 MEDIUM      D4 -> 4 HARD      D5 -> 5 HARD
 *
 * The band is derived on read and never stored on the mapping, so it cannot drift. The authored
 * band is also kept verbatim in golden.difficultyBand, because 1-5 is what the engine reads and
 * D1-D5 is what the blueprint means, and the two should be checkable against each other.
 *
 * ── THE LEGACY COLLISION, AND WHAT IS DONE ABOUT IT ───────────────────────────────────────
 *
 * 151 Golden items were kept, rewritten or remapped from one of the 366 legacy questions, and
 * each records the id it came from. Left alone, both would be PRIMARY evidence for the same
 * skill: the pool would hold the same question twice, coverage would count two items where there
 * is one, and one paper could ask a student the same thing in both its old and its new wording.
 *
 * So the legacy MAPPING is deactivated — `active: false` — for exactly those source questions.
 * Not deleted, and the Question row itself is never touched:
 *
 *   - the model defines active:false as "retired but not forgotten", which is precisely this;
 *   - a frozen paper already sitting in a student's history still references that question by id,
 *     and the grader loads content by id without consulting the mapping, so old attempts still
 *     grade and still explain themselves;
 *   - it is one update to reverse.
 *
 * Legacy mappings NOT cited by any Golden item are left active and reported rather than touched.
 * Deactivating them would be a decision about the bank's composition, which is not this script's
 * to make, but the count is printed because it is the difference between a Foundation paper
 * drawn purely from the Golden bank and one that can still reach older material.
 *
 * ── WHAT IS NEVER TOUCHED ────────────────────────────────────────────────────────────────
 *
 * StudentSkillEvidence and StudentSkillProfile. Those record what somebody demonstrated, not what
 * was asked. They are counted in the report so the zero is visible rather than assumed.
 *
 *   npx ts-node src/scripts/importGoldenBank.ts <tenantId>
 *   npx ts-node src/scripts/importGoldenBank.ts <tenantId> --apply
 *   npx ts-node src/scripts/importGoldenBank.ts <tenantId> --apply --keep-legacy
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import AssessmentItem from '../models/AssessmentItem';
import CareerSkill from '../models/CareerSkill';
import SkillEvidence from '../models/SkillEvidence';
import StudentSkillEvidence from '../models/StudentSkillEvidence';
import StudentSkillProfile from '../models/StudentSkillProfile';
import { AssessmentDimension } from '../constants/assessment';

dotenv.config();

const MASTER = path.join(__dirname, '../../../docs/audit/foundation-golden-bank-master.csv');
const CREATED_BY = 'foundation-golden-bank';
const LETTERS = ['A', 'B', 'C', 'D'] as const;
const BANDS = ['D1', 'D2', 'D3', 'D4', 'D5'];
const PROVENANCE = ['AUTHORED', 'LEGACY_KEEP', 'LEGACY_REWRITE', 'LEGACY_REMAP'];

/**
 * Which of the six exam dimensions each Foundation skill belongs to.
 *
 * `dimension` is a required enum on AssessmentItem and predates this bank, so a value has to be
 * chosen for every row. It is NOT the skill — the skill lives on the mapping, which is what the
 * generator reads — and nothing in the Golden path selects on it. It is written so the row is
 * valid and so the admin screen groups it somewhere sensible, and it is spelled out here rather
 * than guessed per row so the choice can be argued with.
 */
const DIMENSION: Record<string, AssessmentDimension> = {
  APTITUDE_DATA_INTERPRETATION: 'aptitude',
  APTITUDE_REASONING_LOGIC: 'aptitude',
  APTITUDE_REASONING_SERIES: 'aptitude',
  PATTERN_RECOGNITION: 'aptitude',

  PROBLEM_SOLVING: 'problem_solving',
  PSEUDOCODE_FLOWCHARTS: 'problem_solving',
  DEBUGGING: 'problem_solving',

  DSA_ARRAYS: 'dsa',
  DSA_STRINGS: 'dsa',

  BROWSER_FUNDAMENTALS: 'core_stack',
  COMPUTER_NETWORKS: 'core_stack',
  CSS: 'core_stack',
  DB_FUNDAMENTALS: 'core_stack',
  GIT_BRANCHING: 'core_stack',
  GIT_FUNDAMENTALS: 'core_stack',
  HTML: 'core_stack',
  HTTP: 'core_stack',
  JS_BASICS: 'core_stack',
  JS_DOM: 'core_stack',
  OPERATING_SYSTEMS: 'core_stack',
  SQL_BASICS: 'core_stack',

  COMPUTER_ARCHITECTURE: 'fundamentals',
  CONDITIONALS_BASICS: 'fundamentals',
  C_BASICS: 'fundamentals',
  C_CONTROL_FLOW: 'fundamentals',
  FUNCTIONS_BASICS: 'fundamentals',
  HOW_COMPUTERS_WORK: 'fundamentals',
  LOOPS_BASICS: 'fundamentals',
  PROGRAMMING_FUNDAMENTALS: 'fundamentals',
  PYTHON_BASICS: 'fundamentals',
  TECHNICAL_COMMUNICATION: 'fundamentals',
  TECHNICAL_EXPLANATION: 'fundamentals',
  TECH_CAREER_AWARENESS: 'fundamentals',
};

/**
 * A stable ObjectId derived from the Golden questionId.
 *
 * Idempotency has to survive the row being edited, the script being rerun and the collection
 * being emptied and refilled, so the identity cannot be allocated — it has to be computed. The
 * first 24 hex characters of a sha1 over a namespaced questionId are a valid ObjectId and the
 * same every time. Namespaced so a future bank cannot collide with this one by reusing an id.
 *
 * The dry run checks all 1,650 for collisions rather than trusting the hash.
 */
const stableId = (questionId: string): mongoose.Types.ObjectId =>
  new mongoose.Types.ObjectId(
    crypto.createHash('sha1').update(`GOLDEN:${questionId}`).digest('hex').slice(0, 24),
  );

/** RFC4180, strictly: quoted fields may hold commas, doubled quotes and newlines. */
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  const src = text.replace(/^﻿/, '');

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ',') { row.push(field); field = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  const header = rows.shift() || [];
  return rows
    .filter(r => r.length > 1 || (r[0] || '').trim() !== '')
    .map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

interface Problem { questionId: string; reason: string }

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  const keepLegacy = process.argv.includes('--keep-legacy');

  if (!tenantId) {
    console.error('Usage: importGoldenBank.ts <tenantId> [--apply] [--keep-legacy]');
    process.exit(1);
  }
  if (!fs.existsSync(MASTER)) {
    console.error(`Master bank not found: ${MASTER}`);
    process.exit(1);
  }

  const rows = parseCsv(fs.readFileSync(MASTER, 'utf8'));
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  /* ---- validate every row before anything is decided ------------------------------------ */

  const malformed: Problem[] = [];
  const badDifficulty: Problem[] = [];
  const missingFact: Problem[] = [];
  const missingFamily: Problem[] = [];
  const missingGroup: Problem[] = [];
  const badProvenance: Problem[] = [];

  const seenQid = new Set<string>();
  const duplicateQid: string[] = [];
  const byStableId = new Map<string, string[]>();

  for (const r of rows) {
    const qid = (r.questionId || '').trim();
    const note = (reason: string, into: Problem[]) => into.push({ questionId: qid || '(blank)', reason });

    if (!qid) { malformed.push({ questionId: '(blank)', reason: 'no questionId' }); continue; }
    if (seenQid.has(qid)) duplicateQid.push(qid);
    seenQid.add(qid);

    const id = String(stableId(qid));
    byStableId.set(id, [...(byStableId.get(id) || []), qid]);

    if (!r.skillKey?.trim()) note('no skillKey', malformed);
    if (!r.prompt?.trim()) note('empty prompt', malformed);

    const opts = LETTERS.map(L => (r[`option${L}`] ?? '').trim());
    if (opts.some(o => !o)) note('fewer than four options', malformed);
    else if (new Set(opts).size !== 4) note('options are not four distinct texts', malformed);

    const key = (r.correctOption || '').trim();
    if (!LETTERS.includes(key as any)) note(`correctOption is "${key}"`, malformed);
    else if (opts[LETTERS.indexOf(key as any)] !== (r.correctAnswerText || '').trim()) {
      note('key does not point at correctAnswerText', malformed);
    }

    if (!BANDS.includes((r.difficulty || '').trim())) {
      badDifficulty.push({ questionId: qid, reason: `difficulty is "${r.difficulty}"` });
    }
    if (!r.factId?.trim()) missingFact.push({ questionId: qid, reason: 'no factId' });
    if (!r.familyId?.trim()) missingFamily.push({ questionId: qid, reason: 'no familyId' });
    if (!r.reassessmentGroup?.trim()) missingGroup.push({ questionId: qid, reason: 'no reassessmentGroup' });
    if (!PROVENANCE.includes((r.provenance || '').trim())) {
      badProvenance.push({ questionId: qid, reason: `provenance is "${r.provenance}"` });
    }
  }

  const duplicateStableIds = [...byStableId.entries()].filter(([, q]) => q.length > 1);

  /* ---- validate the skills the bank claims ---------------------------------------------- */

  const skillKeys = [...new Set(rows.map(r => (r.skillKey || '').trim().toUpperCase()).filter(Boolean))];
  const skillDocs = await CareerSkill.find({ key: { $in: skillKeys } })
    .select('key name active assessable nodeType').lean() as any[];
  const bySkill = new Map(skillDocs.map(s => [String(s.key).toUpperCase(), s]));

  const missingSkills = skillKeys.filter(k => !bySkill.has(k));
  const nonAssessable = skillKeys.filter(k => bySkill.get(k)?.assessable === false || bySkill.get(k)?.nodeType === 'GROUP');
  const inactiveSkills = skillKeys.filter(k => bySkill.has(k) && bySkill.get(k)!.active === false);
  const unmappedDimension = skillKeys.filter(k => !DIMENSION[k]);

  /* ---- what exists already, so creates and updates are counted rather than guessed ------ */

  const ids = rows.map(r => stableId(r.questionId));
  const existingItems = await AssessmentItem.find({ tenantId, _id: { $in: ids } })
    .select('_id').lean() as any[];
  const existingItemIds = new Set(existingItems.map(i => String(i._id)));

  const existingEvidence = await SkillEvidence.find({
    tenantId, sourceType: 'assessment_item', sourceId: { $in: ids.map(String) },
  }).select('sourceId skillKey').lean() as any[];
  const existingEvidenceKeys = new Set(existingEvidence.map(e => `${e.sourceId}:${String(e.skillKey).toUpperCase()}`));

  let itemCreates = 0, itemUpdates = 0, evidenceCreates = 0, evidenceUpdates = 0;
  for (const r of rows) {
    const id = String(stableId(r.questionId));
    if (existingItemIds.has(id)) itemUpdates++; else itemCreates++;
    if (existingEvidenceKeys.has(`${id}:${(r.skillKey || '').trim().toUpperCase()}`)) evidenceUpdates++;
    else evidenceCreates++;
  }

  /* ---- the legacy collision ------------------------------------------------------------- */

  const cited = [...new Set(rows
    .filter(r => (r.provenance || '').trim() !== 'AUTHORED')
    .map(r => (r.sourceQuestionId || '').trim())
    .filter(Boolean))];

  const legacyAll = await SkillEvidence.find({ tenantId, sourceType: 'question' })
    .select('sourceId skillKey active').lean() as any[];
  const legacyActive = legacyAll.filter(e => e.active !== false);

  /**
   * Provenance records a SHORT id, so the cited value has to be resolved before anything is
   * retired.
   *
   * Phase 2 exported each legacy question as the last six characters of its identifier, which is
   * the discriminating end: ObjectIds begin with a timestamp, so the 366 questions share long
   * prefixes and differ at the tail. Matching on the front finds nothing at all — the first
   * version of this script reported "0 collisions, 151 not found" and would have left every
   * duplicate live while appearing to have checked.
   *
   * A short id that matches two questions is NOT resolved to either. Retiring the wrong question
   * is silent and removes a good item from the pool, so ambiguity is reported and blocks the
   * apply rather than being decided by ordering.
   */
  const resolveCited = (short: string): string[] => {
    if (short.length === 24) return legacyAll.some(e => String(e.sourceId) === short) ? [short] : [];
    return [...new Set(legacyAll
      .map(e => String(e.sourceId))
      .filter(id => id.endsWith(short)))];
  };

  const resolved = new Map<string, string[]>(cited.map(c => [c, resolveCited(c)]));
  const citedUnresolved = cited.filter(c => resolved.get(c)!.length === 0);
  const citedAmbiguous = cited.filter(c => resolved.get(c)!.length > 1);
  const citedIds = new Set([...resolved.values()].filter(v => v.length === 1).map(v => v[0]));

  const legacyCollisions = legacyActive.filter(e => citedIds.has(String(e.sourceId)));
  const legacyUncited = legacyActive.filter(e => !citedIds.has(String(e.sourceId)));

  /* ---- student records, counted so the zero is shown rather than claimed ---------------- */

  const studentEvidence = await StudentSkillEvidence.countDocuments({ tenantId });
  const studentProfiles = await StudentSkillProfile.countDocuments({ tenantId });

  /* ---- report ---------------------------------------------------------------------------- */

  const blocking =
    duplicateStableIds.length + duplicateQid.length + missingSkills.length +
    nonAssessable.length + inactiveSkills.length + malformed.length +
    badDifficulty.length + badProvenance.length + unmappedDimension.length +
    citedAmbiguous.length;

  const pad = (s: string) => s.padEnd(38);
  console.log(`\nGOLDEN BANK IMPORT — tenant ${tenantId} — ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log(`destination: AssessmentItem, mapped as sourceType "assessment_item"\n`);
  console.log(pad('Golden rows') + rows.length);
  console.log(pad('skills') + skillKeys.length);
  console.log(pad('expected source creates') + itemCreates);
  console.log(pad('expected source updates') + itemUpdates);
  console.log(pad('expected SkillEvidence creates') + evidenceCreates);
  console.log(pad('expected SkillEvidence updates') + evidenceUpdates);
  console.log(pad('duplicate stable IDs') + duplicateStableIds.length);
  console.log(pad('duplicate Golden questionIds') + duplicateQid.length);
  console.log(pad('missing CareerSkill keys') + missingSkills.length);
  console.log(pad('non-assessable skills') + nonAssessable.length);
  console.log(pad('inactive skills') + inactiveSkills.length);
  console.log(pad('skills with no dimension mapping') + unmappedDimension.length);
  console.log(pad('malformed questions') + malformed.length);
  console.log(pad('invalid D1-D5 values') + badDifficulty.length);
  console.log(pad('invalid provenance values') + badProvenance.length);
  console.log(pad('missing factId') + missingFact.length);
  console.log(pad('missing familyId') + missingFamily.length);
  console.log(pad('missing reassessmentGroup') + missingGroup.length);
  console.log(pad('legacy collision risks') + legacyCollisions.length);
  console.log(pad('student evidence rows affected') + 0);

  console.log(`\nDIFFICULTY — authored band, stored value, and the band the generator reads`);
  const byBand = new Map<string, number>();
  for (const r of rows) byBand.set(r.difficulty, (byBand.get(r.difficulty) || 0) + 1);
  for (const b of BANDS) {
    const n = Number(b.slice(1));
    console.log(`  ${b} -> difficulty ${n} -> ${n <= 2 ? 'EASY' : n === 3 ? 'MEDIUM' : 'HARD'}`
      + `${''.padEnd(6)}${byBand.get(b) || 0} rows`);
  }

  console.log(`\nLEGACY BANK`);
  console.log('  ' + pad('legacy `question` mappings, total') + legacyAll.length);
  console.log('  ' + pad('of those active') + legacyActive.length);
  console.log('  ' + pad('short ids cited by Golden provenance') + cited.length);
  console.log('  ' + pad('  of those resolved to one question') + citedIds.size);
  console.log('  ' + pad('  ambiguous, resolving to several') + citedAmbiguous.length);
  console.log('  ' + pad('  unresolved, no such question') + citedUnresolved.length);
  console.log('  ' + pad('active mappings to be deactivated') + legacyCollisions.length
    + (keepLegacy ? '   (left active: --keep-legacy)' : ''));
  console.log('  ' + pad('not cited, left active and untouched') + legacyUncited.length);
  console.log('  ' + pad('Question rows deleted') + 0 + '   (mappings are deactivated, never removed)');

  console.log(`\nSTUDENT RECORDS — read only, never written by this script`);
  console.log('  ' + pad('StudentSkillEvidence rows') + studentEvidence);
  console.log('  ' + pad('StudentSkillProfile rows') + studentProfiles);

  const show = (label: string, list: Problem[] | string[]) => {
    if (!list.length) return;
    console.log(`\n${label} (${list.length})`);
    for (const p of list.slice(0, 15)) {
      console.log('  ' + (typeof p === 'string' ? p : `${p.questionId}: ${p.reason}`));
    }
    if (list.length > 15) console.log(`  ... ${list.length - 15} more`);
  };
  show('MALFORMED', malformed);
  show('INVALID DIFFICULTY', badDifficulty);
  show('INVALID PROVENANCE', badProvenance);
  show('MISSING factId', missingFact);
  show('MISSING familyId', missingFamily);
  show('MISSING reassessmentGroup', missingGroup);
  show('MISSING SKILLS', missingSkills);
  show('NON-ASSESSABLE SKILLS', nonAssessable);
  show('INACTIVE SKILLS', inactiveSkills);
  show('SKILLS WITH NO DIMENSION', unmappedDimension);
  show('DUPLICATE STABLE IDS', duplicateStableIds.map(([id, q]) => `${id} <- ${q.join(', ')}`));
  show('AMBIGUOUS PROVENANCE IDS', citedAmbiguous.map(c => `${c} -> ${resolved.get(c)!.join(', ')}`));
  show('UNRESOLVED PROVENANCE IDS', citedUnresolved);

  if (!apply) {
    console.log(`\nDry run. Nothing was written.`);
    console.log(blocking ? `${blocking} blocking problem(s) — apply would refuse.` : 'No blocking problems.');
    await mongoose.disconnect();
    process.exit(blocking ? 1 : 0);
  }

  if (blocking) {
    console.log(`\nREFUSED — ${blocking} blocking problem(s). Nothing was written.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  /* ---- apply ----------------------------------------------------------------------------- */

  const itemOps = rows.map(r => {
    const qid = r.questionId.trim();
    const skillKey = r.skillKey.trim().toUpperCase();
    const band = r.difficulty.trim();
    const opts = LETTERS.map(L => ({ id: L, text: (r[`option${L}`] || '').trim() }));
    return {
      updateOne: {
        filter: { _id: stableId(qid) },
        update: {
          $set: {
            tenantId,
            type: 'mcq',
            dimension: DIMENSION[skillKey],
            difficulty: Number(band.slice(1)),
            prompt: r.prompt,
            options: opts,
            correctOptionIds: [r.correctOption.trim()],
            explanation: r.explanation || '',
            points: 1,
            tags: ['foundation', 'golden-bank', skillKey],
            // The working copy the selector reads. golden.factId below is the audit trail.
            factKeys: [r.factId.trim()],
            active: true,
            createdBy: CREATED_BY,
            golden: {
              questionId: qid,
              skillKey,
              conceptId: r.conceptId.trim(),
              factId: r.factId.trim(),
              familyId: r.familyId.trim(),
              reassessmentGroup: r.reassessmentGroup.trim(),
              difficultyBand: band,
              provenance: r.provenance.trim(),
              sourceQuestionId: (r.sourceQuestionId || '').trim() || undefined,
            },
          },
        },
        upsert: true,
      },
    };
  });

  const evidenceOps = rows.map(r => {
    const sourceId = String(stableId(r.questionId.trim()));
    const skillKey = r.skillKey.trim().toUpperCase();
    return {
      updateOne: {
        // The unique index is (sourceType, sourceId, skillKey), so this filter is the identity
        // of the row and a rerun can only ever update.
        filter: { sourceType: 'assessment_item', sourceId, skillKey },
        update: {
          $set: { tenantId, contribution: 'PRIMARY', active: true, updatedBy: CREATED_BY },
          // Audience stays empty on insert and is never overwritten on update: narrowing is an
          // admin's decision and a reimport must not quietly undo it.
          $setOnInsert: {
            audienceRoles: [], audienceYears: [], audienceCourses: [], audienceBranches: [],
            createdBy: CREATED_BY,
          },
        },
        upsert: true,
      },
    };
  });

  const itemRes = await AssessmentItem.bulkWrite(itemOps as any, { ordered: false });
  const evRes = await SkillEvidence.bulkWrite(evidenceOps as any, { ordered: false });

  let deactivated = 0;
  if (!keepLegacy && legacyCollisions.length) {
    const res = await SkillEvidence.updateMany(
      { tenantId, sourceType: 'question', sourceId: { $in: [...citedIds] }, active: true },
      { $set: { active: false, updatedBy: CREATED_BY } },
    );
    deactivated = res.modifiedCount ?? 0;
  }

  console.log(`\nAPPLIED`);
  console.log('  ' + pad('AssessmentItem inserted') + (itemRes.upsertedCount ?? 0));
  console.log('  ' + pad('AssessmentItem updated') + (itemRes.modifiedCount ?? 0));
  console.log('  ' + pad('SkillEvidence inserted') + (evRes.upsertedCount ?? 0));
  console.log('  ' + pad('SkillEvidence updated') + (evRes.modifiedCount ?? 0));
  console.log('  ' + pad('legacy mappings deactivated') + deactivated);
  console.log('  ' + pad('rows deleted, anywhere') + 0);
  console.log('  ' + pad('student rows written') + 0);

  await mongoose.disconnect();
})().catch(e => { console.error('ERR', e?.message || e); process.exit(1); });
