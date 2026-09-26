/**
 * Seed one YEAR of the curriculum: its LearningCurriculum row, its topics, and its units.
 *
 * ── WHY THIS IS SHARED AND NOT COPIED ─────────────────────────────────────────────────────
 *
 * Year 2's seeder was a 279-line script with its stage key, title and dataset written into it.
 * Year 3 needed the same script with three words changed, and a copy of something this long is a
 * second opinion about how a curriculum is written — the two would have drifted on the first fix
 * applied to only one of them. The seed-time skill inheritance below is exactly the kind of rule
 * that must not exist twice: it is the difference between every unit in a year being measurable
 * and none of them being.
 *
 * So the year is a parameter. What differs between Year 2 and Year 3 is a stage key, a title, a
 * module tree, a dataset and a recommended length; everything else — the taxonomy gate, the dry
 * run, the upsert split between structure and authorship — is a statement about how any year is
 * seeded.
 *
 * ── DRY RUN BY DEFAULT ────────────────────────────────────────────────────────────────────
 *
 * Nothing is written without --apply, and the dry run reports exactly what the apply would do,
 * counted from the same code path rather than estimated.
 *
 * ── WHAT IS RE-APPLIED AND WHAT IS NOT ────────────────────────────────────────────────────
 *
 * STRUCTURE is re-applied on every run: titles, outcomes, minutes, ordering, prerequisites. That
 * is the dataset's to own, and editing the dataset should reach the database.
 *
 * AUTHORSHIP is written only on insert: category, depth, directions, mandatory, and status. An
 * admin who narrows a unit's directions or publishes it must not have that undone by a re-seed.
 * Every new unit lands DRAFT — no student sees any of it until somebody publishes it.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LearningCurriculum from '../../models/LearningCurriculum';
import CurriculumLearningUnit from '../../models/CurriculumLearningUnit';
import CareerSkill from '../../models/CareerSkill';
import type { FoundationModuleSeed } from './foundationSkillMap';
import type { TopicSeed } from './year1MegaCurriculum';

dotenv.config();

/** Colours cycle per module, so the roadmap reads as bands rather than a wall of one hue. */
const MODULE_COLOURS = [
  '#051D64', '#359AAD', '#3b82f6', '#8b5cf6', '#059669',
  '#d97706', '#dc2626', '#0891b2', '#7c3aed', '#ca8a04',
];

export interface StageCurriculumSpec {
  /** For the console only: "Year 2". */
  yearLabel: string;
  stageKey: string;
  title: string;
  description: string;
  modules: FoundationModuleSeed[];
  /** The unit dataset, keyed by topic code. */
  dataset: Record<string, TopicSeed>;
  /** Every skill key the map names, for the taxonomy gate. */
  referencedSkillKeys: () => string[];
  /**
   * A starting figure, not the governing one. What a student gets is the tenant's admin setting,
   * resolved per journey; this is only what a brand-new curriculum row is created with.
   */
  defaultTotalDays: number;
  createdBy: string;
}

/**
 * Topic rows for the curriculum, flattened from the module tree.
 *
 * `startDay`/`endDay` are left at zero deliberately. In Year 1 they describe a fixed calendar;
 * a later year's length is an admin setting and its days are composed per student, so a day
 * range stored here would be a number nobody maintains and everybody eventually believes.
 */
const topicRows = (spec: StageCurriculumSpec) => {
  const rows: any[] = [];
  let order = 0;
  spec.modules.forEach((mod, modIndex) => {
    for (const t of mod.topics) {
      rows.push({
        title: t.title,
        description: `${mod.moduleName} · ${(t.learningOutcomes || [])[0] || ''}`.trim(),
        order: order++,
        startDay: 0,
        endDay: 0,
        color: MODULE_COLOURS[modIndex % MODULE_COLOURS.length],
        moduleCode: mod.moduleCode,
        topicCode: t.topicCode,
        skillKeys: t.skillKeys || [],
        prerequisiteSkillKeys: (t as any).prerequisiteSkillKeys || [],
        defaultDepth: (t as any).defaultDepth || 'STANDARD',
        mandatory: (t as any).category === 'UNIVERSAL',
        backbone: !!(t as any).backbone,
        applicableDirections: (t as any).applicableDirections || [],
        learningOutcomes: t.learningOutcomes || [],
      });
    }
  });
  return rows;
};

/** Every unit in the dataset, with the topic and module it belongs to resolved. */
const unitRows = (spec: StageCurriculumSpec, tenantId: string) => {
  const topicToModule = new Map<string, string>();
  /**
   * Skills are declared once, on the topic in the stage map, and inherited by every unit in it.
   * The unit dataset carries structure and no skills at all, so reading them from there leaves
   * every unit unmeasurable: no evidence, no Skill DNA, nothing for the composer to reason about.
   */
  const topicSkills = new Map<string, string[]>();
  for (const mod of spec.modules) {
    for (const t of mod.topics) {
      topicToModule.set(t.topicCode, mod.moduleCode);
      topicSkills.set(t.topicCode, t.skillKeys || []);
    }
  }

  const rows: any[] = [];
  for (const [topicCode, topic] of Object.entries(spec.dataset)) {
    const moduleCode = topicToModule.get(topicCode);
    if (!moduleCode) {
      throw new Error(`Topic ${topicCode} is in the unit dataset but not in the ${spec.yearLabel} modules.`);
    }

    (topic as any).units.forEach((u: any, i: number) => {
      rows.push({
        tenantId,
        unitCode: `${topicCode}_${u.slug}`,
        stageKey: spec.stageKey,
        moduleCode,
        topicCode,
        /* Structure — re-applied on every run. */
        structure: {
          title: u.title,
          description: u.description,
          learningOutcomes: u.learningOutcomes || [],
          estimatedMinutes: u.estimatedMinutes,
          displayOrder: (i + 1) * 10,
          skillKeys: u.skillKeys || topicSkills.get(topicCode) || [],
          prerequisiteSkillKeys: u.prerequisiteSkillKeys || [],
          prerequisiteUnitCodes: (u.after || []).map((a: string) => `${topicCode}_${a}`),
          unitType: u.unitType || 'CONCEPT',
        },
        /* Authorship — written only when the row is first created. */
        authored: {
          category: (topic as any).category || 'UNIVERSAL',
          defaultDepth: u.defaultDepth || (topic as any).defaultDepth || 'STANDARD',
          applicableDirections: u.applicableDirections || (topic as any).applicableDirections || [],
          mandatory: (topic as any).category === 'UNIVERSAL',
          audience: { languages: [], years: [], branches: [] },
          status: 'DRAFT',
        },
      });
    });
  }
  return rows;
};

/** Reads the tenant and --apply from argv, connects, plans, reports and (when asked) writes. */
export async function runStageCurriculumSeed(spec: StageCurriculumSpec): Promise<void> {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId) {
    console.error(`Usage: seed${spec.yearLabel.replace(/\s+/g, '')}Curriculum.ts <tenantId> [--apply]`);
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  /* ── Gate: every skill the map names must exist ───────────────────────────────────────── */
  const referenced = spec.referencedSkillKeys();
  /* The taxonomy keys on `key`, and is global rather than per-tenant. */
  const known = new Set<string>(
    (await CareerSkill.find({ key: { $in: referenced } }).select('key').lean() as any[])
      .map(s => String(s.key)),
  );
  const unknownSkills = referenced.filter(k => !known.has(k));

  const topics = topicRows(spec);
  const units = unitRows(spec, tenantId);

  const existingCurriculum = await LearningCurriculum
    .findOne({ tenantId, adaptiveStage: spec.stageKey }).select('_id title').lean() as any;

  const existingUnits = new Set<string>(
    (await CurriculumLearningUnit.find({ tenantId, stageKey: spec.stageKey })
      .select('unitCode').lean() as any[]).map(u => String(u.unitCode)),
  );

  const toInsert = units.filter(u => !existingUnits.has(u.unitCode));
  const toUpdate = units.filter(u => existingUnits.has(u.unitCode));

  console.log(`\n${spec.yearLabel} → tenant ${tenantId}`);
  console.log(`  curriculum : ${existingCurriculum ? 'UPDATE' : 'CREATE'} "${spec.title}" (stage '${spec.stageKey}')`);
  console.log(`  modules    : ${spec.modules.length}`);
  console.log(`  topics     : ${topics.length}`);
  console.log(`  units      : ${units.length}  (insert ${toInsert.length}, update ${toUpdate.length})`);
  console.log(`  status     : every inserted unit lands DRAFT`);
  console.log(`  skills     : ${referenced.length} referenced, ${unknownSkills.length} unknown`);

  if (unknownSkills.length) {
    console.error(`\n  REFUSED. These skill keys are not in the taxonomy:\n    ${unknownSkills.join('\n    ')}`);
    console.error('  Add them to careerSkillTaxonomy.ts and seed the taxonomy before running this.');
    await mongoose.disconnect();
    process.exit(1);
  }

  if (!apply) {
    console.log('\n  DRY RUN. Nothing was written. Re-run with --apply to write it.\n');
    await mongoose.disconnect();
    return;
  }

  /* ── 1. The curriculum row, with its topics ───────────────────────────────────────────── */
  const curriculumId = existingCurriculum
    ? String(existingCurriculum._id)
    : String((await LearningCurriculum.create({
      tenantId,
      title: spec.title,
      description: spec.description,
      totalDays: spec.defaultTotalDays,
      topics: [],
      modules: [],
      isPublished: false,
      shared: false,
      createdBy: spec.createdBy,
      isMasterTrack: true,
      adaptiveStage: spec.stageKey,
    }))._id);

  await LearningCurriculum.updateOne(
    { _id: curriculumId },
    {
      $set: {
        title: spec.title,
        topics,
        modules: spec.modules.map(m => ({
          moduleCode: m.moduleCode, moduleName: m.moduleName,
          displayOrder: m.displayOrder, blurb: m.blurb,
        })),
        adaptiveStage: spec.stageKey,
      },
    },
  );

  /* ── 2. The units ─────────────────────────────────────────────────────────────────────── */
  const ops = units.map(u => ({
    updateOne: {
      filter: { tenantId, unitCode: u.unitCode },
      update: {
        $set: {
          ...u.structure,
          stageKey: u.stageKey,
          moduleCode: u.moduleCode,
          topicCode: u.topicCode,
          updatedBy: spec.createdBy,
        },
        $setOnInsert: {
          tenantId,
          unitCode: u.unitCode,
          ...u.authored,
          createdBy: spec.createdBy,
        },
      },
      upsert: true,
    },
  }));

  const result = await CurriculumLearningUnit.bulkWrite(ops, { ordered: false });

  console.log(`\n  WRITTEN.`);
  console.log(`  curriculum : ${curriculumId}`);
  console.log(`  topics     : ${topics.length}`);
  console.log(`  units      : ${result.upsertedCount} inserted, ${result.modifiedCount} updated`);
  console.log(`\n  Every new unit is DRAFT. No student sees any of this until it is published.\n`);

  await mongoose.disconnect();
}
