/**
 * Make the Year-1 modules the thing a first-year's roadmap is actually planned from.
 *
 * WHAT IT WRITES. One StageSkillSet for the `foundation` stage, built from FOUNDATION_MODULES
 * by `foundationStageRequirements`. From then on `getStageBlueprint` resolves it into blueprint
 * shape and role readiness, the paper builder and the roadmap planner all read the Year-1
 * syllabus without a single new branch between them.
 *
 * WHY A SEED RATHER THAN A MIGRATION. The set is a tenant's to edit afterwards — a college that
 * does not teach C removes it, one that does turns the academic rows on. This writes the
 * starting point; the admin screen owns it from there.
 *
 * IT REFUSES RATHER THAN GUESSES. An unknown skill key stops the run, exactly as the curriculum
 * seed does: a requirement pointing at a skill that does not exist joins a student's readiness
 * calculation as a permanent unmeasurable gap, and looks like it worked.
 *
 * IT WILL NOT SILENTLY OVERWRITE AN ADMIN. A set that already has requirements is left alone
 * and reported unless --replace is passed. Re-running a seed must not be how somebody's
 * curation disappears.
 *
 * ENABLING IS SEPARATE AND DELIBERATE. A new set is written switched off, because turning it on
 * changes what every first-year at that tenant is planned against. --enable is the act that
 * says so out loud.
 *
 *   npx ts-node src/seeds/careerPilot/seedFoundationStageSkillSet.ts <tenantId>
 *   npx ts-node src/seeds/careerPilot/seedFoundationStageSkillSet.ts <tenantId> --apply
 *   npx ts-node src/seeds/careerPilot/seedFoundationStageSkillSet.ts <tenantId> --apply --enable
 *   npx ts-node src/seeds/careerPilot/seedFoundationStageSkillSet.ts <tenantId> --apply --replace
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CareerSkill from '../../models/CareerSkill';
import { getStageSkillSet, saveStageSkillSet } from '../../services/stageSkillSetService';
import {
  foundationStageRequirements, FOUNDATION_STAGE, FOUNDATION_SET_LABEL,
} from './foundationStageSkillSet';
import { buildStageRequirements, BUILD_STAGE, BUILD_SET_LABEL } from './year2StageSkillSet';
import { specializeStageRequirements, SPECIALIZE_STAGE, SPECIALIZE_SET_LABEL } from './year3StageSkillSet';
import { placementStageRequirements, PLACEMENT_STAGE, PLACEMENT_SET_LABEL } from './year4StageSkillSet';

dotenv.config();

export interface SeedStageSetReport {
  created: boolean;
  updated: boolean;
  /** True when a curated set was found and left exactly as it was. */
  skippedExisting: boolean;
  enabled: boolean;
  skills: number;
  active: number;
  inactive: number;
  /** Skills the existing set had that the modules no longer reference. */
  droppedByReplace: string[];
  /** Skills the modules reference that the existing set did not have. */
  added: string[];
  unknownSkillKeys: string[];
}

/**
 * The four years, each with its own stage, its own label and its own bar.
 *
 * A table rather than a chain. With two years this was a pair of ternaries repeated three
 * times; with three it became a chain repeated three times, and the failure mode of that shape
 * is one of the three disagreeing — a set written under Year 3's stage key carrying Year 2's
 * label, or measured against Year 2's bar.
 *
 * It lives at module scope rather than inside the function because the CLI needs it too, and
 * the CLI is where that exact failure had already happened: its report resolved the label with
 * `year2 ? BUILD_SET_LABEL : FOUNDATION_SET_LABEL`, so every Year-3 run printed "CareerPilot
 * Year 1 — Foundation" over a Year-3 set and told the operator to re-run without `--year3`.
 * The write was correct; only the account of it was wrong, which is the kind of bug that is
 * believed for months.
 */
export const STAGE_SET_YEARS = {
  foundation: { stage: FOUNDATION_STAGE, label: FOUNDATION_SET_LABEL, requirements: foundationStageRequirements, flag: '' },
  build:      { stage: BUILD_STAGE,      label: BUILD_SET_LABEL,      requirements: buildStageRequirements,      flag: ' --year2' },
  specialize: { stage: SPECIALIZE_STAGE, label: SPECIALIZE_SET_LABEL, requirements: specializeStageRequirements, flag: ' --year3' },
  placement:  { stage: PLACEMENT_STAGE,  label: PLACEMENT_SET_LABEL,  requirements: placementStageRequirements,  flag: ' --year4' },
} as const;

export type StageSetYear = keyof typeof STAGE_SET_YEARS;

/** Which year a set of flags is asking for. Latest year wins, so the flags cannot contradict. */
export const stageSetYearOf = (o: { year2?: boolean; year3?: boolean; year4?: boolean }): StageSetYear =>
  o.year4 ? 'placement' : o.year3 ? 'specialize' : o.year2 ? 'build' : 'foundation';

export async function seedFoundationStageSkillSet(opts: {
  tenantId: string;
  apply?: boolean;
  enable?: boolean;
  replace?: boolean;
  actor?: string;
  /**
   * Write the Year-2 set instead. Off by default, so every existing caller stays on Year 1.
   *
   * The two years are separate rows on separate stages, never one set covering both: a
   * second-year is measured against a second-year's bar, and a set that mixed them would plan
   * one year's student against the other year's expectations.
   */
  year2?: boolean;
  /** Write the Year-3 set. Same rule: its own row, its own stage, its own bar. */
  year3?: boolean;
  /** Write the Year-4 set. Same rule again. */
  year4?: boolean;
}): Promise<SeedStageSetReport> {
  const year = stageSetYearOf(opts);
  const { stage, label } = STAGE_SET_YEARS[year];
  const built = STAGE_SET_YEARS[year].requirements();
  const report: SeedStageSetReport = {
    created: false, updated: false, skippedExisting: false, enabled: false,
    skills: built.summary.skills,
    active: built.summary.active,
    inactive: built.summary.inactive,
    droppedByReplace: [], added: [], unknownSkillKeys: [],
  };

  /**
   * Validate every key BEFORE writing anything.
   *
   * The same rule the curriculum seed holds: a set that points at skills which do not exist is
   * worse than no set, because it produces a plan full of objectives nobody can measure.
   */
  const wanted = built.requirements.map(r => r.skillKey);
  const known = await CareerSkill.find({ key: { $in: wanted } }).select('key').lean() as any[];
  const knownSet = new Set(known.map(k => String(k.key).toUpperCase()));
  report.unknownSkillKeys = wanted.filter(k => !knownSet.has(k));
  if (report.unknownSkillKeys.length) return report;

  const existing = await getStageSkillSet(opts.tenantId, stage);
  const existingKeys = new Set((existing?.requirements || []).map(r => String(r.skillKey).toUpperCase()));
  const wantedKeys = new Set(wanted);

  report.added = wanted.filter(k => !existingKeys.has(k));
  report.droppedByReplace = [...existingKeys].filter(k => !wantedKeys.has(k)).sort();

  const curated = !!existing && (existing.requirements || []).length > 0;
  if (curated && !opts.replace) {
    report.skippedExisting = true;
    report.enabled = !!existing!.enabled;
    return report;
  }

  if (!opts.apply) {
    report.created = !existing;
    report.updated = !!existing;
    report.enabled = opts.enable ? true : !!existing?.enabled;
    return report;
  }

  const doc = await saveStageSkillSet({
    tenantId: opts.tenantId,
    stage,
    label,
    // Undefined leaves an existing choice alone; a brand-new set stays off unless asked.
    enabled: opts.enable ? true : (existing ? undefined : false),
    requirements: built.requirements,
    actor: opts.actor || 'foundation-stage-seed',
  });

  report.created = !existing;
  report.updated = !!existing;
  report.enabled = !!doc.enabled;
  return report;
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

if (require.main === module) {
  (async () => {
    const tenantId = process.argv[2];
    const apply = process.argv.includes('--apply');
    const enable = process.argv.includes('--enable');
    const replace = process.argv.includes('--replace');
    const year2 = process.argv.includes('--year2');
    const year3 = process.argv.includes('--year3');
    const year4 = process.argv.includes('--year4');
    if (!tenantId) {
      console.error('Usage: seedFoundationStageSkillSet.ts <tenantId> [--apply] [--enable] [--replace] [--year2|--year3|--year4]');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
    /* One resolution, shared with the write below, so the report cannot describe another year. */
    const year = stageSetYearOf({ year2, year3, year4 });
    const { stage, label, flag } = STAGE_SET_YEARS[year];
    const built = STAGE_SET_YEARS[year].requirements();
    const r = await seedFoundationStageSkillSet({ tenantId, apply: apply || enable, enable, replace, year2, year3, year4 });

    if (r.unknownSkillKeys.length) {
      console.error('\nREFUSED — these skill keys do not exist in the taxonomy:');
      for (const k of r.unknownSkillKeys) console.error('  ' + k);
      console.error('\nSeed the taxonomy first:  npx ts-node src/scripts/seedCareerSkills.ts --apply');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`\n${label} → stage skill set "${stage}"`);
    console.log(`  modules            : ${built.summary.modules}`);
    console.log(`  topics             : ${built.summary.topics}`);
    console.log(`  skills             : ${r.skills}`);
    console.log(`  switched on        : ${r.active}   (every UNIVERSAL topic)`);
    console.log(`  written but off    : ${r.inactive}   (direction, academic, exploration, enrichment)`);
    for (const [k, n] of Object.entries(built.summary.byImportance)) {
      console.log(`    ${k.padEnd(11)}: ${n}`);
    }
    if (r.added.length) console.log(`  new to this tenant : ${r.added.length}`);
    if (r.droppedByReplace.length) {
      console.log(`  would be removed   : ${r.droppedByReplace.length} — ${r.droppedByReplace.slice(0, 8).join(', ')}${r.droppedByReplace.length > 8 ? ' …' : ''}`);
    }

    if (r.skippedExisting) {
      console.log(`\nLEFT ALONE — this tenant already has a curated ${stage} set.`);
      console.log('Pass --replace to overwrite it with the module-derived one.');
    } else if (apply || enable) {
      console.log(`\n${r.created ? 'CREATED' : 'UPDATED'}  —  enabled = ${r.enabled}`);
      if (!r.enabled) {
        console.log('\nIt is written but OFF, so nothing has changed for any student yet.');
        console.log('Turn it on when the list says what you want it to say:');
        console.log(`  npx ts-node src/seeds/careerPilot/seedFoundationStageSkillSet.ts ${tenantId} --apply --enable${flag}`);
      } else {
        console.log(`\nStudents on '${stage}' with no chosen role are now planned against the ${label} modules.`);
        console.log('Author their journeys in the Learning Studio:  /admin/learning-studio');
      }
    } else {
      console.log(`\nDRY RUN — would ${r.updated ? 'update the existing' : 'create a new'} set.`);
      console.log('Pass --apply to write.');
    }

    await mongoose.disconnect();
  })().catch(e => { console.error('ERR', e.message); process.exit(1); });
}
