/**
 * Write the Year-1 curriculum into the ninety-day spine as day-units.
 *
 * IDEMPOTENT, AND IT WILL NOT OVERWRITE AN AUTHOR. A day-unit that already exists keeps its
 * title, its journey pointer and its audience — those are the parts a person edits — and only
 * its band and order are corrected. Re-running a seed must not be how somebody's curation
 * disappears.
 *
 * IT REPORTS THE GAP RATHER THAN FILLING IT. The curriculum covers about a third of the spine,
 * and this says so on every run. Seeding placeholders for the other two thirds would put a plan
 * in front of a student with sixty empty days in it.
 *
 *   npx ts-node src/seeds/careerPilot/seedCurriculumDayUnits.ts <tenantId>
 *   npx ts-node src/seeds/careerPilot/seedCurriculumDayUnits.ts <tenantId> --apply
 *   npx ts-node src/seeds/careerPilot/seedCurriculumDayUnits.ts <tenantId> --apply --publish
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CurriculumDayUnit from '../../models/CurriculumDayUnit';
import CareerSkill from '../../models/CareerSkill';
import { SPINE_BANDS, SPINE_DAYS } from '../../data/ninetyDayPolicy';
import { spineCoverage } from '../../services/ninetyDaySelectorService';
import { seededDayUnits, unbandedModules } from './dayUnitSeed';

dotenv.config();

export interface DayUnitSeedReport {
  created: number;
  updated: number;
  unchanged: number;
  published: number;
  unknownSkillKeys: string[];
  coverage: { band: string; label: string; needed: number; available: number }[];
  filled: number;
}

export async function seedCurriculumDayUnits(opts: {
  tenantId: string;
  apply?: boolean;
  publish?: boolean;
  actor?: string;
}): Promise<DayUnitSeedReport> {
  const units = seededDayUnits();

  const report: DayUnitSeedReport = {
    created: 0, updated: 0, unchanged: 0, published: 0,
    unknownSkillKeys: [], coverage: [], filled: 0,
  };

  /**
   * Validate the skills BEFORE writing, exactly as the other Year-1 seeds do.
   *
   * A day-unit pointing at a skill that does not exist can never resolve a journey, so it would
   * occupy a slot in the spine and teach nothing — a hole that looks like a day.
   */
  const wanted = [...new Set(units.map(u => u.skillKey).filter(Boolean))];
  const known = await CareerSkill.find({ key: { $in: wanted } }).select('key').lean() as any[];
  const knownSet = new Set(known.map(k => String(k.key).toUpperCase()));
  report.unknownSkillKeys = wanted.filter(k => !knownSet.has(k));
  if (report.unknownSkillKeys.length) return report;

  const status = opts.publish ? 'PUBLISHED' : 'DRAFT';

  for (const u of units) {
    const existing: any = await CurriculumDayUnit.findOne({
      tenantId: opts.tenantId, dayUnitId: u.dayUnitId,
    }).lean();

    if (!existing) {
      report.created++;
      if (opts.apply) {
        await CurriculumDayUnit.create({
          tenantId: opts.tenantId, ...u, status, createdBy: opts.actor || 'day-unit-seed',
        });
        if (opts.publish) report.published++;
      }
      continue;
    }

    // Only the structural fields. Title, journey pointer and audience belong to whoever edited
    // them last, and a seed is not that person.
    const needsBand = existing.band !== u.band || existing.displayOrder !== u.displayOrder;
    if (!needsBand) { report.unchanged++; continue; }

    report.updated++;
    if (opts.apply) {
      await CurriculumDayUnit.updateOne(
        { tenantId: opts.tenantId, dayUnitId: u.dayUnitId },
        { $set: { band: u.band, displayOrder: u.displayOrder, updatedBy: opts.actor || 'day-unit-seed' } },
      );
    }
  }

  const c = spineCoverage({
    units: units.map(u => ({
      dayUnitId: u.dayUnitId, band: u.band, displayOrder: u.displayOrder,
      title: u.title, skillKey: u.skillKey, journeyTopic: u.journeyTopic,
      subtopics: u.subtopics, audience: u.audience, estimatedMinutes: u.estimatedMinutes,
    })),
    student: {},
  });
  report.coverage = c.rows.map(r => ({
    band: r.band,
    label: SPINE_BANDS.find(b => b.key === r.band)!.label,
    needed: r.needed,
    available: r.available,
  }));
  report.filled = c.filled;

  return report;
}

if (require.main === module) {
  (async () => {
    const tenantId = process.argv[2];
    const apply = process.argv.includes('--apply');
    const publish = process.argv.includes('--publish');
    if (!tenantId) {
      console.error('Usage: seedCurriculumDayUnits.ts <tenantId> [--apply] [--publish]');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
    const r = await seedCurriculumDayUnits({ tenantId, apply, publish });

    if (r.unknownSkillKeys.length) {
      console.error('\nREFUSED — these skill keys do not exist in the taxonomy:');
      for (const k of r.unknownSkillKeys) console.error('  ' + k);
      console.error('\nSeed the taxonomy first:  npx ts-node src/scripts/seedCareerSkills.ts --apply');
      await mongoose.disconnect();
      process.exit(1);
    }

    const pad = (s: string, n: number) => s.padEnd(n);
    console.log('\nYear-1 curriculum as ninety-day spine day-units\n');
    console.log(`  ${pad('BAND', 32)}${pad('NEED', 7)}${pad('HAVE', 7)}`);
    for (const row of r.coverage) {
      const short = row.needed - row.available;
      console.log(`  ${pad(row.label, 32)}${pad(String(row.needed), 7)}${pad(String(row.available), 7)}${short > 0 ? `${short} short` : 'full'}`);
    }
    console.log(`\n  ${pad('TOTAL', 32)}${pad(String(SPINE_DAYS), 7)}${pad(String(r.filled), 7)}${Math.round((r.filled / SPINE_DAYS) * 100)}% of the spine`);

    const skipped = unbandedModules();
    if (skipped.length) console.log(`\n  Not part of the spine: ${skipped.join(', ')}`);

    console.log(`\n  created ${r.created} · updated ${r.updated} · unchanged ${r.unchanged}`);
    if (apply) {
      console.log(`\nWRITTEN as ${publish ? 'PUBLISHED' : 'DRAFT'}.`);
      if (!publish) console.log('Pass --publish to make them selectable.');
      console.log('\nA student\'s plan stays unavailable until every band can be filled.');
      console.log('Author the missing day-units in the Learning Studio, one track at a time.');
    } else {
      console.log('\nDRY RUN — nothing written. Pass --apply.');
    }

    await mongoose.disconnect();
  })().catch(e => { console.error('ERR', e.message); process.exit(1); });
}
