/**
 * The skill registry the Golden Bank will be authored against.
 *
 * READ-ONLY. Nothing is written but the CSV. No questions are generated or imported.
 *
 * WHY IT DOES NOT RECOMPUTE COVERAGE. The counts come from
 * docs/audit/foundation-assessment-coverage.csv, which was itself produced by calling the
 * generator's own functions. Two files that each derive measurability independently will agree
 * until they do not, and the day they disagree there is no way to tell which one the students
 * are living with. One number, one origin: this registry joins stage membership and taxonomy
 * metadata onto counts it takes as given, and says so when a skill is missing from them.
 *
 * MEMBERSHIP IS THE STAGE SKILL SET, metadata is CareerSkill, order is the stage set's own
 * displayOrder — which is the order the curriculum introduces things, so an author reading this
 * top to bottom is walking the year in sequence rather than an alphabet.
 *
 *   npx ts-node src/scripts/foundationGoldenBankRegistry.ts <tenantId> [--stage=foundation]
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CareerSkill from '../models/CareerSkill';
import StageSkillSet from '../models/StageSkillSet';

dotenv.config();

const ROOT = path.join(__dirname, '../../..');
const COVERAGE_IN = path.join(ROOT, 'docs/audit/foundation-assessment-coverage.csv');
const CSV_OUT = path.join(ROOT, 'docs/audit/foundation-golden-bank-skill-registry.csv');

/**
 * The state of the tenant when this registry was last generated, so a drift is reported rather
 * than absorbed.
 *
 * THESE ARE NOW OBSERVED FIGURES, not the pre-audit placeholders they replaced. The Golden Bank
 * was imported into the codebegun development tenant on 2026-09-10 — 2,700 questions across 54
 * skills, every one of them measurable — and these are what the run reported. The previous values
 * (33 assessable, 15 measurable, 18 insufficient) described the database before the Year-1 audit
 * and were deliberately left stale so the drift lines would keep saying the import had not
 * happened. It has, so they say so no longer.
 *
 * WHAT TO DO IF THIS DRIFTS AGAIN. Read what changed before editing these numbers. A drop in
 * `measurable` means a skill lost its pool; a rise in `assessableSkills` means the curriculum
 * grew and the stage set was realigned. Either is worth understanding before it is recorded, and
 * a number updated without that is a rubber stamp rather than a check.
 *
 * `totalQuestions` counts the LEGACY quiz bank, not the Golden bank — those rows are retired from
 * Foundation selection but never deleted, so the figure is a check that nobody has quietly
 * removed content, not a measure of what the diagnostic draws on.
 */
const EXPECTED = {
  assessableSkills: 54,
  nonAssessableExcluded: ['SELF_LEARNING'],
  measurable: 54,
  insufficient: 0,
  totalQuestions: 366,
};

/** Minimal CSV reader — the coverage file is machine-written, but skill names carry commas. */
function readCsv(file: string): Record<string, string>[] {
  const lines = fs.readFileSync(file, 'utf8').trim().split(/\r?\n/);
  const head = lines[0].split(',');
  return lines.slice(1).map(line => {
    const cells: string[] = [];
    let cur = '', inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQuotes) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') inQuotes = false;
        else cur += c;
      } else if (c === '"') inQuotes = true;
      else if (c === ',') { cells.push(cur); cur = ''; }
      else cur += c;
    }
    cells.push(cur);
    return Object.fromEntries(head.map((h, i) => [h, cells[i] ?? '']));
  });
}

const csvCell = (v: any) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

(async () => {
  const tenantId = process.argv[2];
  const stageArg = process.argv.find(a => a.startsWith('--stage='));
  const stage = stageArg ? stageArg.split('=')[1] : 'foundation';

  if (!tenantId) {
    console.error('Usage: foundationGoldenBankRegistry.ts <tenantId> [--stage=foundation]');
    process.exit(1);
  }
  if (!fs.existsSync(COVERAGE_IN)) {
    console.error(`Coverage file missing: ${COVERAGE_IN}`);
    console.error('Run foundationCoverageReport.ts first — this registry joins onto its numbers');
    console.error('rather than deriving its own, so the two can never disagree.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const coverage = new Map<string, Record<string, string>>(
    readCsv(COVERAGE_IN).map(r => [String(r.skillKey).toUpperCase(), r]),
  );

  const set = await StageSkillSet.findOne({ tenantId, stage }).lean() as any;
  if (!set) {
    console.error(`No stage skill set exists for "${stage}".`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const members = ((set.requirements || []) as any[]).filter(r => r.active !== false);
  const skillDocs = await CareerSkill.find({
    key: { $in: members.map(r => String(r.skillKey).toUpperCase()) },
  }).select('key name domainKey parentKey nodeType difficulty active assessable').lean() as any[];
  const meta = new Map<string, any>(skillDocs.map(s => [String(s.key).toUpperCase(), s]));

  // Non-assessable and grouping nodes are out: no paper can ask about them, so authoring
  // questions for them would produce content nothing would ever serve.
  const excluded = members
    .map(r => String(r.skillKey).toUpperCase())
    .filter(k => {
      const d = meta.get(k);
      return !d || d.assessable === false || d.nodeType === 'GROUP';
    });

  const rows = members
    .map(r => {
      const key = String(r.skillKey).toUpperCase();
      const d = meta.get(key);
      const cov = coverage.get(key);
      return {
        skillKey: key,
        skillName: d?.name || key,
        category: d?.domainKey || '',
        parentSkillKey: d?.parentKey || '',
        assessable: !!d?.assessable,
        active: d?.active !== false,
        stageIncluded: true,
        importance: r.importance || '',
        weight: r.weight ?? '',
        targetLevel: r.targetLevel || '',
        displayOrder: r.displayOrder ?? 0,
        // Taken as given from the coverage export, never re-derived here.
        currentPrimaryItems: cov ? Number(cov.primaryAssessmentItems) : null,
        distinctPrimaryFacts: cov ? Number(cov.distinctPrimaryFacts) : null,
        measurementStatus: cov ? cov.measurementStatus : 'NOT_IN_COVERAGE_EXPORT',
      };
    })
    .filter(r => !excluded.includes(r.skillKey))
    .sort((a, b) => a.displayOrder - b.displayOrder || a.skillKey.localeCompare(b.skillKey));

  /* ---- CSV ---------------------------------------------------------------------------- */

  const header = [
    'skillKey', 'skillName', 'category', 'parentSkillKey', 'assessable', 'active',
    'stageIncluded', 'importance', 'weight', 'targetLevel', 'displayOrder',
    'currentPrimaryItems', 'distinctPrimaryFacts', 'measurementStatus',
  ];
  fs.mkdirSync(path.dirname(CSV_OUT), { recursive: true });
  fs.writeFileSync(
    CSV_OUT,
    [header.join(','), ...rows.map(r => header.map(h => csvCell((r as any)[h])).join(','))].join('\n') + '\n',
    'utf8',
  );

  /* ---- compact list ------------------------------------------------------------------- */

  console.log('');
  rows.forEach((r, i) => {
    console.log(`${String(i + 1).padStart(2, '0')} | ${r.skillKey} | ${r.skillName} `
      + `| ${r.currentPrimaryItems} | ${r.distinctPrimaryFacts} | ${r.measurementStatus}`);
  });

  /* ---- verification ------------------------------------------------------------------- */

  const measurable = rows.filter(r => r.measurementStatus === 'MEASURABLE').length;
  const insufficient = rows.filter(r => r.measurementStatus === 'INSUFFICIENT_EVIDENCE').length;
  const totalQuestions = await mongoose.connection.db.collection('questions').countDocuments({ tenantId });

  console.log(`\nFoundation StageSkillSet members: ${members.length}`);
  console.log(`Assessable Foundation skills:     ${rows.length}`);
  console.log(`Non-assessable excluded:          ${excluded.length ? excluded.join(', ') : 'none (already excluded upstream)'}`);
  console.log(`Currently measurable:             ${measurable}`);
  console.log(`Currently insufficient:           ${insufficient}`);
  console.log(`Total existing questions:         ${totalQuestions}`);

  /**
   * Discrepancies are REPORTED, never corrected.
   *
   * The whole value of an audit is that it describes what is there. A report that quietly adjusts
   * itself to an expectation is a report that cannot tell you the expectation was wrong.
   */
  const drift: string[] = [];
  if (rows.length !== EXPECTED.assessableSkills) {
    drift.push(`assessable skills: expected ${EXPECTED.assessableSkills}, found ${rows.length}`);
  }
  /**
   * A non-assessable skill can be absent for two different reasons, and only one is a problem.
   *
   * It is expected to be excluded HERE only if it reached this script as a stage-set member. The
   * align step already declines to admit non-assessable skills, so SELF_LEARNING never enters
   * the set and there is nothing for this filter to remove — the exclusion happened one step
   * earlier and the outcome is identical. Reported as "already excluded upstream" rather than as
   * a mismatch, because calling it a discrepancy would send somebody looking for a fault that is
   * the system working correctly. It IS a discrepancy if the skill is neither excluded here nor
   * absent, which would mean a non-assessable skill had reached the registry.
   */
  const stillPresent = EXPECTED.nonAssessableExcluded.filter(k => rows.some(r => r.skillKey === k));
  if (stillPresent.length) {
    drift.push(`non-assessable skill(s) present in the registry: ${stillPresent.join(', ')}`);
  }
  const upstream = EXPECTED.nonAssessableExcluded.filter(k => !excluded.includes(k) && !stillPresent.includes(k));
  if (measurable !== EXPECTED.measurable) drift.push(`measurable: expected ${EXPECTED.measurable}, found ${measurable}`);
  if (insufficient !== EXPECTED.insufficient) drift.push(`insufficient: expected ${EXPECTED.insufficient}, found ${insufficient}`);
  if (totalQuestions !== EXPECTED.totalQuestions) {
    drift.push(`question bank: expected ${EXPECTED.totalQuestions}, found ${totalQuestions}`);
  }
  const missingCoverage = rows.filter(r => r.measurementStatus === 'NOT_IN_COVERAGE_EXPORT');
  if (missingCoverage.length) {
    drift.push(`${missingCoverage.length} skill(s) absent from the coverage export: `
      + missingCoverage.map(r => r.skillKey).join(', '));
  }

  console.log(drift.length
    ? `\n⚠ DISCREPANCY — reported, not corrected:\n  ${drift.join('\n  ')}`
    : '\n✅ matches expected values exactly');

  console.log(`\nwritten: ${path.relative(ROOT, CSV_OUT).replace(/\\/g, '/')}`);
  console.log('read-only: no database writes, no questions generated or imported.');
  await mongoose.disconnect();
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
