/**
 * Import Year 2 — the 'build' stage — into a tenant: its curriculum, its topics and its units.
 *
 * DRY RUN BY DEFAULT.
 *
 *   npx ts-node src/seeds/careerPilot/seedYear2Curriculum.ts <tenantId>
 *   npx ts-node src/seeds/careerPilot/seedYear2Curriculum.ts <tenantId> --apply
 *
 * WHY THIS EXISTS SEPARATELY FROM THE YEAR-1 SEEDS. Year 1 already has a curriculum row to write
 * topics into; Year 2 has nothing at all. This creates the 'build' curriculum first, then fills
 * it, so the two years never share a row and a Year-2 mistake can never move a Year-1 unit.
 *
 * NOTHING IS PUBLISHED, AND THAT IS THE POINT. Every unit lands DRAFT. A DRAFT unit is invisible
 * to every planning path — `composerCandidateService` requires `status === 'PUBLISHED'` for a
 * PRODUCTION set — so importing 296 units changes nothing any student can see, and cannot move
 * the certified Year-1 inventory of 347. Publishing is a separate, deliberate act.
 *
 * IDEMPOTENT, AND IT DOES NOT OVERWRITE AUTHORSHIP. Rows are upserted on their code. Structure —
 * title, order, outcomes, duration, prerequisites, skills — belongs to the dataset and is
 * re-applied every run. Category, depth, directions and STATUS belong to whoever edited them in
 * the admin and are written only on insert: a re-run must never unpublish a unit somebody
 * published, nor undo a direction filter somebody set.
 *
 * IT REFUSES RATHER THAN INVENTS. Every skill key is checked against the CareerSkill taxonomy
 * before anything is written, and an unknown key aborts the run. A mistyped key would otherwise
 * create a mapping to a skill with no questions and no meaning, and it would join a student's
 * plan silently.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LearningCurriculum from '../../models/LearningCurriculum';
import CurriculumLearningUnit from '../../models/CurriculumLearningUnit';
import CareerSkill from '../../models/CareerSkill';
import {
  BUILD_STAGE_KEY, BUILD_TITLE, BUILD_MODULES, buildReferencedSkillKeys,
} from './year2StageMap';
import { YEAR2 } from './year2MegaCurriculum';

dotenv.config();

const CREATED_BY = 'year2-curriculum-seed';

/** Colours cycle per module, so the roadmap reads as bands rather than a wall of one hue. */
const MODULE_COLOURS = [
  '#051D64', '#359AAD', '#3b82f6', '#8b5cf6', '#059669',
  '#d97706', '#dc2626', '#0891b2', '#7c3aed', '#ca8a04',
];

interface Plan {
  curriculumAction: 'CREATE' | 'UPDATE';
  topics: number;
  unitsToInsert: string[];
  unitsToUpdate: string[];
  unknownSkills: string[];
}

/**
 * Topic rows for the curriculum, flattened from the module tree.
 *
 * `startDay`/`endDay` are left at zero deliberately. In Year 1 they describe a fixed calendar;
 * Year 2's length is an admin setting and its days are composed per student, so a day range
 * stored here would be a number nobody maintains and everybody eventually believes.
 */
const topicRows = () => {
  const rows: any[] = [];
  let order = 0;
  BUILD_MODULES.forEach((mod, modIndex) => {
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
const unitRows = (tenantId: string) => {
  const topicToModule = new Map<string, string>();
  /**
   * Skills are declared once, on the topic in the stage map, and inherited by every unit in it.
   * The unit dataset carries structure and no skills at all, so reading them from there leaves
   * every unit unmeasurable: no evidence, no Skill DNA, nothing for the composer to reason about.
   */
  const topicSkills = new Map<string, string[]>();
  for (const mod of BUILD_MODULES) {
    for (const t of mod.topics) {
      topicToModule.set(t.topicCode, mod.moduleCode);
      topicSkills.set(t.topicCode, t.skillKeys || []);
    }
  }

  const rows: any[] = [];
  for (const [topicCode, topic] of Object.entries(YEAR2)) {
    const moduleCode = topicToModule.get(topicCode);
    if (!moduleCode) throw new Error(`Topic ${topicCode} is in the unit dataset but not in BUILD_MODULES.`);

    (topic as any).units.forEach((u: any, i: number) => {
      rows.push({
        tenantId,
        unitCode: `${topicCode}_${u.slug}`,
        stageKey: BUILD_STAGE_KEY,
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

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId) {
    console.error('Usage: seedYear2Curriculum.ts <tenantId> [--apply]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  /* ── Gate: every skill the dataset names must exist ───────────────────────────────────── */
  const referenced = buildReferencedSkillKeys();
  /* The taxonomy keys on `key`, and is global rather than per-tenant. */
  const known = new Set<string>(
    (await CareerSkill.find({ key: { $in: referenced } }).select('key').lean() as any[])
      .map(s => String(s.key)),
  );
  const unknownSkills = referenced.filter(k => !known.has(k));

  const topics = topicRows();
  const units = unitRows(tenantId);

  const existingCurriculum = await LearningCurriculum
    .findOne({ tenantId, adaptiveStage: BUILD_STAGE_KEY }).select('_id title').lean() as any;

  const existingUnits = new Set<string>(
    (await CurriculumLearningUnit.find({ tenantId, stageKey: BUILD_STAGE_KEY })
      .select('unitCode').lean() as any[]).map(u => String(u.unitCode)),
  );

  const plan: Plan = {
    curriculumAction: existingCurriculum ? 'UPDATE' : 'CREATE',
    topics: topics.length,
    unitsToInsert: units.filter(u => !existingUnits.has(u.unitCode)).map(u => u.unitCode),
    unitsToUpdate: units.filter(u => existingUnits.has(u.unitCode)).map(u => u.unitCode),
    unknownSkills,
  };

  console.log(`\nYear 2 → tenant ${tenantId}`);
  console.log(`  curriculum : ${plan.curriculumAction} "${BUILD_TITLE}" (stage '${BUILD_STAGE_KEY}')`);
  console.log(`  modules    : ${BUILD_MODULES.length}`);
  console.log(`  topics     : ${plan.topics}`);
  console.log(`  units      : ${units.length}  (insert ${plan.unitsToInsert.length}, update ${plan.unitsToUpdate.length})`);
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
      title: BUILD_TITLE,
      description: 'The second year: building real things, choosing a direction, and becoming employable.',
      /**
       * A starting figure, not the governing one. What a student actually gets is the tenant's
       * admin setting, resolved per journey; this is the recommended floor — 110 days is where
       * the backbone plus one track stops being tight enough to leave a weak joiner no room.
       */
      totalDays: 110,
      topics: [],
      modules: [],
      isPublished: false,
      shared: false,
      createdBy: CREATED_BY,
      isMasterTrack: true,
      adaptiveStage: BUILD_STAGE_KEY,
    }))._id);

  await LearningCurriculum.updateOne(
    { _id: curriculumId },
    {
      $set: {
        title: BUILD_TITLE,
        topics,
        modules: BUILD_MODULES.map(m => ({
          moduleCode: m.moduleCode, moduleName: m.moduleName,
          displayOrder: m.displayOrder, blurb: m.blurb,
        })),
        adaptiveStage: BUILD_STAGE_KEY,
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
          updatedBy: CREATED_BY,
        },
        $setOnInsert: {
          tenantId,
          unitCode: u.unitCode,
          ...u.authored,
          createdBy: CREATED_BY,
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
})().catch(async (e) => {
  console.error('\nFAILED:', e?.message || e);
  await mongoose.disconnect();
  process.exit(1);
});
