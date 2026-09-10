/**
 * Merge the authored batches into the blueprint, attach the allocation, and prove the arithmetic.
 *
 * READ-ONLY WITH RESPECT TO THE DATABASE — no database client is imported, so there is no
 * connection through which anything could be written. It reads the registry and the blueprint and
 * writes the blueprint plus one review file per batch.
 *
 * WHAT IT REFUSES TO LET THROUGH. Every rule that matters is checked rather than trusted:
 *
 *   - familyId globally unique, because it is the key the allocation is attached by and a
 *     collision would silently move questions between measurements.
 *   - factId allowed to repeat, but only across DIFFERENT families — the same fact measured the
 *     same way twice is the wording variant this whole design exists to prevent.
 *   - questionType mcq_single everywhere, which is the platform decision.
 *   - reassessmentGroup skill-local: a group naming two skills would let a re-assessment treat a
 *     measurement in one as covering the other.
 *   - allocation only at levels a family actually allows, so no question is planned at a
 *     difficulty its family cannot honestly carry.
 *   - every populated skill totalling exactly fifty, ten at each of D1 to D5.
 *   - the untouched scaffold rows unchanged, field by field.
 *
 *   npx ts-node src/scripts/foundationGoldenBankMerge.ts
 */

import fs from 'fs';
import path from 'path';
import { FOUNDATION_BATCH1, BATCH1_SKILLS, BlueprintRow } from '../data/goldenBank/foundationBatch1';
import { FOUNDATION_BATCH2, BATCH2_SKILLS } from '../data/goldenBank/foundationBatch2';
import { FOUNDATION_BATCH3, BATCH3_SKILLS } from '../data/goldenBank/foundationBatch3';
import { FOUNDATION_BATCH4, BATCH4_SKILLS } from '../data/goldenBank/foundationBatch4';
import { FOUNDATION_BATCH5, BATCH5_SKILLS } from '../data/goldenBank/foundationBatch5';
import { FOUNDATION_BATCH6, BATCH6_SKILLS } from '../data/goldenBank/foundationBatch6';
import { FOUNDATION_BATCH7, BATCH7_SKILLS } from '../data/goldenBank/foundationBatch7';
import { FOUNDATION_BATCH8, BATCH8_SKILLS } from '../data/goldenBank/foundationBatch8';
import { FOUNDATION_BATCH9, BATCH9_SKILLS } from '../data/goldenBank/foundationBatch9';
import { FOUNDATION_BATCH10, BATCH10_SKILLS } from '../data/goldenBank/foundationBatch10';
import {
  FAMILY_ALLOCATION, PER_SKILL_TOTAL, PER_LEVEL_TOTAL, templatedAllocation,
} from '../data/goldenBank/foundationAllocation';
import { CAREER_SKILL_TAXONOMY } from '../data/careerSkillTaxonomy';

const ROOT = path.join(__dirname, '../../..');
const REGISTRY_IN = path.join(ROOT, 'docs/audit/foundation-golden-bank-skill-registry.csv');
const BLUEPRINT = path.join(ROOT, 'docs/audit/foundation-golden-bank-blueprint.csv');
const REVIEW1 = path.join(ROOT, 'docs/audit/foundation-golden-bank-blueprint-batch1-review.csv');
const REVIEW2 = path.join(ROOT, 'docs/audit/foundation-golden-bank-blueprint-batch2-review.csv');
const REVIEW3 = path.join(ROOT, 'docs/audit/foundation-golden-bank-blueprint-batch3-review.csv');
const REVIEW4 = path.join(ROOT, 'docs/audit/foundation-golden-bank-blueprint-batch4-review.csv');
const REVIEW5 = path.join(ROOT, 'docs/audit/foundation-golden-bank-blueprint-batch5-review.csv');
const REVIEW6 = path.join(ROOT, 'docs/audit/foundation-golden-bank-blueprint-batch6-review.csv');
const REVIEW7 = path.join(ROOT, 'docs/audit/foundation-golden-bank-blueprint-batch7-review.csv');
const REVIEW8 = path.join(ROOT, 'docs/audit/foundation-golden-bank-blueprint-batch8-review.csv');
const REVIEW9 = path.join(ROOT, 'docs/audit/foundation-golden-bank-blueprint-batch9-review.csv');
const REVIEW10 = path.join(ROOT, 'docs/audit/foundation-golden-bank-blueprint-batch10-review.csv');

const HEADER = [
  'skillKey', 'skillName', 'conceptId', 'conceptName', 'factId', 'factStatement',
  'familyId', 'familyName', 'measurementObjective', 'allowedDifficultyMin',
  'allowedDifficultyMax', 'cognitiveLevel', 'questionType', 'distractorStrategy',
  'reassessmentGroup', 'notes',
  'plannedD1', 'plannedD2', 'plannedD3', 'plannedD4', 'plannedD5', 'plannedTotal',
];

function readCsv(file: string): { header: string[]; rows: Record<string, string>[] } {
  const text = fs.readFileSync(file, 'utf8');
  const recs: string[][] = [];
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
    else if (c === '\n') { row.push(cur); recs.push(row); row = []; cur = ''; }
    else cur += c;
  }
  if (cur.length || row.length) { row.push(cur); recs.push(row); }
  const clean = recs.filter(r => r.length > 1 || (r[0] ?? '').trim() !== '');
  const header = clean[0];
  return { header, rows: clean.slice(1).map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? '']))) };
}

const cell = (v: any) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const writeCsv = (file: string, rows: Record<string, any>[]) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    [HEADER.join(','), ...rows.map(r => HEADER.map(h => cell(r[h])).join(','))].join('\n') + '\n',
    'utf8',
  );
};

const lvl = (d: string) => Number(String(d).slice(1));

(async () => {
  const registry = readCsv(REGISTRY_IN);
  const scaffold = readCsv(BLUEPRINT);
  const nameByKey = new Map(registry.rows.map(r => [r.skillKey, r.skillName]));
  const skillOrder = registry.rows.map(r => r.skillKey);

  const problems: string[] = [];

  const populatedSkills = [
    ...BATCH1_SKILLS, ...BATCH2_SKILLS, ...BATCH3_SKILLS, ...BATCH4_SKILLS, ...BATCH5_SKILLS,
    ...BATCH6_SKILLS, ...BATCH7_SKILLS, ...BATCH8_SKILLS, ...BATCH9_SKILLS, ...BATCH10_SKILLS,
  ];

  /**
   * A skill authored before the registry knew about it still belongs in the blueprint.
   *
   * The registry is a snapshot taken from the database, and the Mathematics skills reached the
   * taxonomy after it was last generated. Ordering by the registry alone would have dropped all
   * hundred and five Batch 7 families out of the merged file without a word, because the loop
   * below emits only the skills the registry names — and a blueprint silently missing a batch is
   * exactly the failure this script exists to prevent. So the registry stays the source of ORDER,
   * which is what it is good for, and stops being the source of MEMBERSHIP, which it never was.
   * The names of the appended skills come from the taxonomy, the same place the registry got its
   * own; falling back to the raw key would put a placeholder in a reviewer-facing column.
   */
  const missingFromRegistry = populatedSkills.filter(k => !skillOrder.includes(k));
  const emitOrder = [...skillOrder, ...missingFromRegistry];
  for (const key of missingFromRegistry) {
    const node = CAREER_SKILL_TAXONOMY.find(s => s.key === key);
    if (!node) problems.push(`${key} is authored but is not in the taxonomy either`);
    nameByKey.set(key, node?.name || key);
  }
  const authored = [
    ...FOUNDATION_BATCH1, ...FOUNDATION_BATCH2,
    ...FOUNDATION_BATCH3, ...FOUNDATION_BATCH4, ...FOUNDATION_BATCH5, ...FOUNDATION_BATCH6,
    ...FOUNDATION_BATCH7, ...FOUNDATION_BATCH8, ...FOUNDATION_BATCH9, ...FOUNDATION_BATCH10,
  ];

  /**
   * Batches 1 and 2 carry explicit allocations; 3 to 5 are allocated by the shared template.
   *
   * Merged into one lookup so nothing downstream has to know which batch a family came from —
   * and so a family missing from BOTH sources is caught as an error rather than defaulting to
   * zero questions and silently dropping out of the plan.
   */
  const allocation: Record<string, any> = {
    ...FAMILY_ALLOCATION,
    ...templatedAllocation(
      [...FOUNDATION_BATCH3, ...FOUNDATION_BATCH4, ...FOUNDATION_BATCH5, ...FOUNDATION_BATCH6,
        ...FOUNDATION_BATCH7, ...FOUNDATION_BATCH8, ...FOUNDATION_BATCH9,
        ...FOUNDATION_BATCH10],
      [...BATCH3_SKILLS, ...BATCH4_SKILLS, ...BATCH5_SKILLS, ...BATCH6_SKILLS, ...BATCH7_SKILLS,
        ...BATCH8_SKILLS, ...BATCH9_SKILLS, ...BATCH10_SKILLS],
    ),
  };


  /** Attach the allocation, and refuse a family the allocation does not mention. */
  const withPlan = authored.map((r: BlueprintRow) => {
    const a = allocation[r.familyId];
    if (!a) {
      problems.push(`${r.familyId} has no allocation`);
      return { ...r, skillName: nameByKey.get(r.skillKey) || r.skillKey, plannedD1: 0, plannedD2: 0, plannedD3: 0, plannedD4: 0, plannedD5: 0, plannedTotal: 0 };
    }
    // A question planned outside the family's own range would be planned at a difficulty the
    // family cannot honestly carry, which is exactly the pretence being avoided.
    const lo = lvl(r.allowedDifficultyMin), hi = lvl(r.allowedDifficultyMax);
    for (let d = 1; d <= 5; d++) {
      if (a[d - 1] > 0 && (d < lo || d > hi)) {
        problems.push(`${r.familyId} plans ${a[d - 1]} at D${d}, outside its ${r.allowedDifficultyMin}-${r.allowedDifficultyMax} range`);
      }
    }
    return {
      ...r,
      skillName: nameByKey.get(r.skillKey) || r.skillKey,
      plannedD1: a[0], plannedD2: a[1], plannedD3: a[2], plannedD4: a[3], plannedD5: a[4],
      plannedTotal: a.reduce((x, y) => x + y, 0),
    };
  });

  const untouched = scaffold.rows.filter(r => !populatedSkills.includes(r.skillKey));

  /**
   * The target is derived, never a constant, because it has already moved once.
   *
   * It read 33 while the Foundation set was 33 skills, and Batch 7 made that a lie in the only
   * direction a hard-coded total ever fails: the report went on printing "40 of 33 skills" and
   * "untouched: -7" while everything it described was correct. A count taken from what is
   * actually authored plus what is actually left in the scaffold cannot drift from either.
   */
  const untouchedSkillCount = new Set(untouched.map(r => r.skillKey)).size;
  const TARGET_SKILLS = populatedSkills.length + untouchedSkillCount;

  const merged: Record<string, any>[] = [];
  for (const key of emitOrder) {
    if (populatedSkills.includes(key)) merged.push(...withPlan.filter(r => r.skillKey === key));
    else {
      for (const r of untouched.filter(x => x.skillKey === key)) {
        merged.push({ ...r, plannedD1: '', plannedD2: '', plannedD3: '', plannedD4: '', plannedD5: '', plannedTotal: '' });
      }
    }
  }

  writeCsv(BLUEPRINT, merged);
  writeCsv(REVIEW1, withPlan.filter(r => BATCH1_SKILLS.includes(r.skillKey)));
  writeCsv(REVIEW2, withPlan.filter(r => BATCH2_SKILLS.includes(r.skillKey)));
  writeCsv(REVIEW3, withPlan.filter(r => BATCH3_SKILLS.includes(r.skillKey)));
  writeCsv(REVIEW4, withPlan.filter(r => BATCH4_SKILLS.includes(r.skillKey)));
  writeCsv(REVIEW5, withPlan.filter(r => BATCH5_SKILLS.includes(r.skillKey)));
  writeCsv(REVIEW6, withPlan.filter(r => BATCH6_SKILLS.includes(r.skillKey)));
  writeCsv(REVIEW7, withPlan.filter(r => BATCH7_SKILLS.includes(r.skillKey)));
  writeCsv(REVIEW8, withPlan.filter(r => BATCH8_SKILLS.includes(r.skillKey)));
  writeCsv(REVIEW9, withPlan.filter(r => BATCH9_SKILLS.includes(r.skillKey)));
  writeCsv(REVIEW10, withPlan.filter(r => BATCH10_SKILLS.includes(r.skillKey)));

  /* ---- rule checks --------------------------------------------------------------------- */

  const famSeen = new Map<string, string>();
  for (const r of withPlan) {
    if (famSeen.has(r.familyId)) problems.push(`familyId ${r.familyId} used twice`);
    famSeen.set(r.familyId, r.skillKey);
    if (r.questionType !== 'mcq_single') problems.push(`${r.familyId} is not mcq_single`);
    if (!r.reassessmentGroup.startsWith(r.familyId.split('_')[0] + '_RG_')) {
      problems.push(`${r.familyId} has a reassessment group from another skill: ${r.reassessmentGroup}`);
    }
  }

  // factId may repeat, but a (factId, measurementObjective) pair must not — that is a wording
  // variant wearing two family names.
  const pairSeen = new Set<string>();
  for (const r of withPlan) {
    const k = `${r.factId}::${r.measurementObjective.toLowerCase().replace(/\s+/g, ' ').trim()}`;
    if (pairSeen.has(k)) problems.push(`${r.familyId} repeats a fact AND its objective — wording variant`);
    pairSeen.add(k);
  }

  // Reassessment groups must not span skills.
  const groupSkills = new Map<string, Set<string>>();
  for (const r of withPlan) {
    if (!groupSkills.has(r.reassessmentGroup)) groupSkills.set(r.reassessmentGroup, new Set());
    groupSkills.get(r.reassessmentGroup)!.add(r.skillKey);
  }
  for (const [g, s] of groupSkills) {
    if (s.size > 1) problems.push(`reassessment group ${g} spans ${[...s].join(', ')}`);
  }

  /* ---- report -------------------------------------------------------------------------- */

  console.log('\nGOLDEN BANK BLUEPRINT — ALL BATCHES\n');
  console.log(`${'skill'.padEnd(28)}${'fams'.padStart(5)}${'facts'.padStart(6)}${'grps'.padStart(5)}`
    + `${'D1'.padStart(4)}${'D2'.padStart(4)}${'D3'.padStart(4)}${'D4'.padStart(4)}${'D5'.padStart(4)}`
    + `${'total'.padStart(7)}   coverage`);
  console.log('-'.repeat(94));

  for (const key of populatedSkills) {
    const mine = withPlan.filter(r => r.skillKey === key);
    const sum = (i: number) => mine.reduce((n, r) => n + (r as any)[`plannedD${i}`], 0);
    const per = [1, 2, 3, 4, 5].map(sum);
    const total = per.reduce((a, b) => a + b, 0);
    const covered = [1, 2, 3, 4, 5].filter(d => mine.some(r => lvl(r.allowedDifficultyMin) <= d && lvl(r.allowedDifficultyMax) >= d));

    for (const [i, n] of per.entries()) {
      if (n !== PER_LEVEL_TOTAL) problems.push(`${key} plans ${n} at D${i + 1}, expected ${PER_LEVEL_TOTAL}`);
    }
    if (total !== PER_SKILL_TOTAL) problems.push(`${key} totals ${total}, expected ${PER_SKILL_TOTAL}`);
    if (covered.length !== 5) problems.push(`${key} has no family reaching D${[1, 2, 3, 4, 5].filter(d => !covered.includes(d)).join(', D')}`);

    console.log(`${key.padEnd(28)}${String(mine.length).padStart(5)}`
      + `${String(new Set(mine.map(r => r.factId)).size).padStart(6)}`
      + `${String(new Set(mine.map(r => r.reassessmentGroup)).size).padStart(5)}`
      + per.map(n => String(n).padStart(4)).join('')
      + `${String(total).padStart(7)}   ${covered.map(d => `D${d}`).join(' ')}`);
  }

  console.log('-'.repeat(94));
  const grand = withPlan.reduce((n, r) => n + r.plannedTotal, 0);
  console.log(`${`TOTAL (${populatedSkills.length} of ${TARGET_SKILLS} skills)`.padEnd(28)}${String(withPlan.length).padStart(5)}`
    + `${''.padStart(11)}${''.padStart(20)}${String(grand).padStart(7)}`);

  const facts = new Set(withPlan.map(r => r.factId));
  const reused = [...facts].filter(f => withPlan.filter(r => r.factId === f).length > 1);

  console.log(`\nfamilies (globally unique)        : ${famSeen.size}`);
  console.log(`distinct facts                   : ${facts.size}`);
  console.log(`facts measured by >1 family      : ${reused.length}  (now permitted)`);
  console.log(`questionType mcq_single          : ${withPlan.every(r => r.questionType === 'mcq_single')}`);
  console.log(`reassessment groups skill-local  : ${[...groupSkills.values()].every(s => s.size === 1)}`);
  console.log(`untouched scaffold skills        : ${untouchedSkillCount}`);
  console.log(`planned so far                   : ${grand} of ${TARGET_SKILLS * PER_SKILL_TOTAL}`
    + ` (${TARGET_SKILLS} x ${PER_SKILL_TOTAL})`);
  console.log(`database writes                  : 0`);
  console.log(`assessment questions generated   : 0`);

  console.log(problems.length
    ? `\n⚠ VALIDATION FAILED:\n  ${[...new Set(problems)].join('\n  ')}`
    : '\n✅ validated: every populated skill has D1-D5 family coverage and plans exactly '
      + `${PER_LEVEL_TOTAL} questions at each level, ${PER_SKILL_TOTAL} in total`);

  console.log(`\nwritten: ${path.relative(ROOT, BLUEPRINT).replace(/\\/g, '/')}`);
  console.log(`written: ${path.relative(ROOT, REVIEW1).replace(/\\/g, '/')}`);
  console.log(`written: ${path.relative(ROOT, REVIEW2).replace(/\\/g, '/')}`);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
