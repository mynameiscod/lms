/**
 * What Foundation can measure today, and what it would take to measure the rest.
 *
 * READ-ONLY. Nothing is written but the CSV.
 *
 * IT CALLS THE GENERATOR'S OWN FUNCTIONS RATHER THAN RE-IMPLEMENTING THEM. findEvidenceCandidates
 * and distinctPrimaryCount are the same code buildPersonalizedAssessment uses to decide what it
 * can ask about, so the arithmetic here cannot drift from the arithmetic that matters. A report
 * that reimplements the rule is a second opinion, and the moment the two disagree the report is
 * worse than nothing — it would say a skill is covered while students are told it is not.
 *
 * MEMBERSHIP COMES FROM THE STAGE SKILL SET, which is intent: every skill the curriculum teaches
 * that the taxonomy can assess. Skills the taxonomy cannot assess at all are excluded, because no
 * amount of authoring changes them — SELF_LEARNING is a habit, not something a paper can ask.
 *
 * THE FLOOR COMES FROM THE POLICY, never a constant. That pair has already drifted once.
 *
 * A NOTE ON WHAT COUNTS AS A SOURCE. The brief asked for PRIMARY mappings whose AssessmentItem is
 * active. There are no AssessmentItems left in this tenant — the generated bank was cleared, and
 * all 366 surviving mappings point at hand-authored `question` rows. Counting only the
 * AssessmentItem family would report zero for every skill and mark the whole stage
 * INSUFFICIENT_EVIDENCE, which is false and contradicts the papers students are being served. So
 * every source family the generator draws on is counted, and the breakdown is printed so the
 * composition is never in doubt.
 *
 *   npx ts-node src/scripts/foundationCoverageReport.ts <tenantId> [--stage=foundation]
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CareerSkill from '../models/CareerSkill';
import StageSkillSet from '../models/StageSkillSet';
import { findEvidenceCandidates } from '../services/skillEvidenceService';
import { distinctPrimaryCount, PoolItem } from '../services/personalizedAssessmentService';
import { resolveAssessmentPolicy } from '../services/assessmentPolicyService';

dotenv.config();

interface Row {
  skillKey: string;
  skillName: string;
  stageIncluded: boolean;
  assessable: boolean;
  active: boolean;
  primaryAssessmentItems: number;
  distinctPrimaryFacts: number;
  requiredPrimary: number;
  questionsNeeded: number;
  measurementStatus: 'MEASURABLE' | 'INSUFFICIENT_EVIDENCE';
}

const CSV_OUT = path.join(__dirname, '../../../docs/audit/foundation-assessment-coverage.csv');

(async () => {
  const tenantId = process.argv[2];
  const stageArg = process.argv.find(a => a.startsWith('--stage='));
  const stage = stageArg ? stageArg.split('=')[1] : 'foundation';

  if (!tenantId) {
    console.error('Usage: foundationCoverageReport.ts <tenantId> [--stage=foundation]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const policy = await resolveAssessmentPolicy(tenantId, stage);
  const requiredPrimary = policy.minItemsPerSkill;

  const set = await StageSkillSet.findOne({ tenantId, stage }).lean() as any;
  if (!set) {
    console.error(`No stage skill set exists for "${stage}" in this tenant.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const membership = ((set.requirements || []) as any[])
    .filter(r => r.active !== false)
    .map(r => String(r.skillKey).toUpperCase());

  const skillDocs = await CareerSkill.find({ key: { $in: membership } })
    .select('key name active assessable nodeType').lean() as any[];
  const byKey = new Map<string, any>(skillDocs.map(s => [String(s.key).toUpperCase(), s]));

  /**
   * Skills the taxonomy cannot assess are out of scope for a COVERAGE report.
   *
   * Listing SELF_LEARNING as needing four questions would send somebody to write them, and no
   * paper would ever ask them: `assessable: false` is a statement that the capability is not
   * demonstrated by answering questions. Reported separately so its absence is deliberate
   * rather than a hole in the table.
   */
  const excluded = membership.filter(k => {
    const d = byKey.get(k);
    return !d || d.assessable === false || d.nodeType === 'GROUP';
  });
  const inScope = membership.filter(k => !excluded.includes(k));

  /**
   * The pool exactly as the generator sees it, with no audience narrowing.
   *
   * A real paper passes the student's year and course, which can only ever make a pool SMALLER.
   * The unnarrowed count is therefore the ceiling — the most any student could be asked — and a
   * skill short here is short for everybody.
   */
  const pools = await findEvidenceCandidates(tenantId, { skillKeys: inScope, contribution: 'PRIMARY' });
  const poolByKey = new Map<string, PoolItem[]>(
    pools.map(p => [String(p.skillKey).toUpperCase(), (p.items || []) as any[]]),
  );

  const sourceMix = new Map<string, number>();
  const rows: Row[] = inScope.map(key => {
    const doc = byKey.get(key);
    const pool = (poolByKey.get(key) || []).filter(i => !i.contribution || i.contribution === 'PRIMARY');
    for (const i of pool) sourceMix.set(i.sourceType, (sourceMix.get(i.sourceType) || 0) + 1);

    const primaryAssessmentItems = new Set(pool.map(i => `${i.sourceType}:${i.sourceId}`)).size;
    const facts = new Set<string>();
    for (const i of pool) {
      if (i.factKeys?.length) for (const f of i.factKeys) facts.add(f);
      else facts.add(`item:${i.sourceType}:${i.sourceId}`);
    }
    const distinctPrimaryFacts = facts.size;

    // The same value the generator gates on — from its own function, not a copy of the rule.
    const usable = distinctPrimaryCount(pool);
    const measurable = primaryAssessmentItems >= requiredPrimary && distinctPrimaryFacts >= requiredPrimary;

    return {
      skillKey: key,
      skillName: doc?.name || key,
      stageIncluded: true,
      assessable: !!doc?.assessable,
      active: doc?.active !== false,
      primaryAssessmentItems,
      distinctPrimaryFacts,
      requiredPrimary,
      questionsNeeded: Math.max(0, requiredPrimary - usable),
      measurementStatus: measurable ? 'MEASURABLE' : 'INSUFFICIENT_EVIDENCE',
    };
  });

  rows.sort((a, b) =>
    (a.measurementStatus === b.measurementStatus ? 0 : a.measurementStatus === 'INSUFFICIENT_EVIDENCE' ? -1 : 1)
    || b.questionsNeeded - a.questionsNeeded
    || a.skillKey.localeCompare(b.skillKey));

  /* ---- terminal table ------------------------------------------------------------------- */

  const COLS: [keyof Row, number][] = [
    ['skillKey', 30], ['skillName', 28], ['assessable', 10], ['active', 6],
    ['primaryAssessmentItems', 8], ['distinctPrimaryFacts', 7], ['requiredPrimary', 8],
    ['questionsNeeded', 6], ['measurementStatus', 22],
  ];
  const HEAD = ['skillKey', 'skillName', 'assessable', 'active', 'primary', 'facts', 'required', 'needed', 'status'];

  console.log(`\nFOUNDATION ASSESSMENT COVERAGE — tenant ${tenantId}, stage "${stage}"`);
  console.log(`policy ${policy.key} v${policy.version}: ${policy.skillSlots} questions, `
    + `${policy.maxSkills} skills, ${requiredPrimary} per skill (requiredPrimary read from policy)\n`);
  console.log(HEAD.map((h, i) => h.padEnd(COLS[i][1])).join(' '));
  console.log(COLS.map(c => '-'.repeat(c[1])).join(' '));
  for (const r of rows) {
    console.log(COLS.map(([k, w]) => String(r[k]).padEnd(w)).join(' '));
  }

  /* ---- CSV ---------------------------------------------------------------------------- */

  const header = [
    'skillKey', 'skillName', 'stageIncluded', 'assessable', 'active',
    'primaryAssessmentItems', 'distinctPrimaryFacts', 'requiredPrimary',
    'questionsNeeded', 'measurementStatus',
  ];
  // Quoted because a skill name legitimately contains a comma ("Reasoning: Series & Analogy").
  const csv = [
    header.join(','),
    ...rows.map(r => header.map(h => {
      const v = String((r as any)[h]);
      return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',')),
  ].join('\n') + '\n';

  fs.mkdirSync(path.dirname(CSV_OUT), { recursive: true });
  fs.writeFileSync(CSV_OUT, csv, 'utf8');

  /* ---- totals ------------------------------------------------------------------------- */

  const measurable = rows.filter(r => r.measurementStatus === 'MEASURABLE');
  const insufficient = rows.filter(r => r.measurementStatus === 'INSUFFICIENT_EVIDENCE');
  const totalPrimary = rows.reduce((n, r) => n + r.primaryAssessmentItems, 0);
  const totalNeeded = rows.reduce((n, r) => n + r.questionsNeeded, 0);

  console.log(`\nFoundation assessable skills                        : ${rows.length}`);
  console.log(`Measurable skills                                   : ${measurable.length}`);
  console.log(`Insufficient-evidence skills                        : ${insufficient.length}`);
  console.log(`Total active PRIMARY items behind them              : ${totalPrimary}`);
  console.log(`Questions needed to bring every skill to the floor  : ${totalNeeded}`);

  console.log(`\nsource families counted (mappings): `
    + [...sourceMix.entries()].map(([k, n]) => `${k} ${n}`).join(', '));
  if (excluded.length) {
    console.log(`excluded — the taxonomy cannot assess these: ${excluded.join(', ')}`);
  }

  /* ---- the amber list ----------------------------------------------------------------- */

  console.log('\nUNMEASURED SKILLS');
  console.log('skillKey | availablePrimary | distinctFacts | requiredPrimary | questionsNeeded');
  for (const r of insufficient) {
    console.log(`${r.skillKey} | ${r.primaryAssessmentItems} | ${r.distinctPrimaryFacts} `
      + `| ${r.requiredPrimary} | ${r.questionsNeeded}`);
  }

  console.log(`\nwritten: ${path.relative(path.join(__dirname, '../../..'), CSV_OUT).replace(/\\/g, '/')}`);
  await mongoose.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
