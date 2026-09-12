/**
 * Import the Year-1 mega curriculum.
 *
 * DRY RUN BY DEFAULT, AND VALIDATE FIRST.
 *
 *   npx ts-node src/scripts/validateMegaCurriculum.ts <tenantId>     # gate
 *   npx ts-node src/seeds/careerPilot/seedYear1MegaCurriculum.ts <tenantId>
 *   npx ts-node src/seeds/careerPilot/seedYear1MegaCurriculum.ts <tenantId> --apply
 *
 * SUPERSEDES seedPilotLearningUnits. That script decomposed one topic to prove the shape; this
 * one carries all thirty-nine and produces identical unit codes for T_HTML, so the pilot's rows
 * are updated rather than duplicated. Keeping both would mean two seeds writing the same topic.
 *
 * IT IS IDEMPOTENT, AND IT DOES NOT OVERWRITE AUTHORSHIP. Units are upserted on their code.
 * Structure — title, order, outcomes, duration, prerequisites — is the dataset's to own and is
 * re-applied on every run. Category, depth, directions, band and STATUS are the author's and are
 * written only on insert: a re-run must never unpublish a unit somebody published, or undo a
 * direction filter somebody set.
 *
 * NOTHING IS PUBLISHED. Every unit lands as DRAFT, which is invisible to every planning path, and
 * the UNIT engine stays off. Importing three hundred units changes nothing a student can see.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CurriculumLearningUnit from '../../models/CurriculumLearningUnit';
import LearningCurriculum from '../../models/LearningCurriculum';
import { YEAR1 } from './year1MegaCurriculum';

dotenv.config();

const STAGE = 'foundation';

(async () => {
  const tenantId = process.argv[2];
  const apply = process.argv.includes('--apply');
  if (!tenantId) {
    console.error('Usage: seedYear1MegaCurriculum.ts <tenantId> [--apply]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const curriculum = await LearningCurriculum
    .findOne({ tenantId, adaptiveStage: STAGE }).select('title topics').lean() as any;
  if (!curriculum) {
    console.error(`No '${STAGE}' curriculum for tenant ${tenantId}.`);
    process.exit(1);
  }

  const topicByCode = new Map<string, any>(
    ((curriculum.topics || []) as any[]).filter(t => t.topicCode).map(t => [String(t.topicCode), t]),
  );

  const existing = new Set<string>(
    ((await CurriculumLearningUnit.find({ tenantId, stageKey: STAGE })
      .select('unitCode').lean()) as any[]).map(u => String(u.unitCode)),
  );

  console.log(`\n${curriculum.title}  ·  tenant ${tenantId}`);
  console.log(apply ? 'APPLYING\n' : 'DRY RUN — pass --apply to write\n');

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const [topicCode, seed] of Object.entries(YEAR1)) {
    const topic = topicByCode.get(topicCode);
    if (!topic) {
      console.log(`  ${topicCode.padEnd(24)} SKIPPED — not a topic of this curriculum`);
      skipped += seed.units.length;
      continue;
    }

    /**
     * Inherited from the topic, never restated in the dataset.
     *
     * A unit that carried its own copy of the topic's skills, directions or prerequisites would
     * drift silently the first time somebody edited the curriculum. The dataset owns only what is
     * genuinely per-unit.
     */
    const skillKeys = (topic.skillKeys || []).map((k: string) => String(k).toUpperCase());
    const prerequisiteSkillKeys = (topic.prerequisiteSkillKeys || []).map((k: string) => String(k).toUpperCase());
    const applicableDirections = topic.applicableDirections || [];
    const defaultDepth = topic.defaultDepth || 'STANDARD';
    const moduleCode = String(topic.moduleCode || '');

    let topicCreated = 0;
    let topicUpdated = 0;

    for (let i = 0; i < seed.units.length; i++) {
      const unit = seed.units[i];
      const unitCode = `${topicCode}_${unit.slug}`;
      const isNew = !existing.has(unitCode);

      if (apply) {
        await CurriculumLearningUnit.updateOne(
          { tenantId, unitCode },
          {
            $set: {
              stageKey: STAGE,
              moduleCode,
              topicCode,
              title: unit.title,
              description: unit.description,
              displayOrder: (i + 1) * 10,
              // A unit may narrow its topic's skills; most inherit all of them.
              skillKeys: unit.skillKeys?.map(k => k.toUpperCase()) || skillKeys,
              prerequisiteSkillKeys,
              prerequisiteUnitCodes: (unit.after || []).map(s => `${topicCode}_${s}`),
              learningOutcomes: unit.learningOutcomes,
              estimatedMinutes: unit.estimatedMinutes,
              unitType: unit.unitType || 'CONCEPT',
              updatedBy: 'year1-mega-seed',
            },
            $setOnInsert: {
              tenantId,
              unitCode,
              category: seed.category,
              applicableDirections,
              defaultDepth,
              audience: { languages: [], years: [], branches: [] },
              mandatory: topic.mandatory !== false,
              status: 'DRAFT',
              createdBy: 'year1-mega-seed',
            },
          },
          { upsert: true },
        );
      }

      if (isNew) { created++; topicCreated++; } else { updated++; topicUpdated++; }
    }

    console.log(
      `  ${topicCode.padEnd(24)}${String(seed.units.length).padStart(3)} units  `
      + `${seed.category.padEnd(12)}${topicCreated ? `+${topicCreated} new` : ''}`
      + `${topicUpdated ? `  ~${topicUpdated} updated` : ''}`,
    );
  }

  console.log('');
  if (!apply) {
    console.log(`${created} units would be created, ${updated} updated`
      + `${skipped ? `, ${skipped} skipped` : ''}.`);
    console.log('Re-run with --apply.');
  } else {
    const total = await CurriculumLearningUnit.countDocuments({ tenantId, stageKey: STAGE });
    const published = await CurriculumLearningUnit.countDocuments({ tenantId, stageKey: STAGE, status: 'PUBLISHED' });
    console.log(`created ${created}  ·  updated ${updated}${skipped ? `  ·  skipped ${skipped}` : ''}`);
    console.log(`${total} learning units now exist for '${STAGE}'.`);
    console.log(`${published} are published — the rest are DRAFT and reach no student.`);
  }

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
