/**
 * Create the Year-1 foundation curriculum from the skill map.
 *
 * WHY CREATE RATHER THAN MAP. seedFoundationCurriculum applies the map to a curriculum that
 * already exists; running it against a tenant that has never had a first-year curriculum found
 * nothing to match, and reported honestly that it had done nothing. There is no Year-1 content
 * anywhere yet — so the map has to build the thing it describes, not decorate something else.
 *
 * WHAT IT PRODUCES. One LearningCurriculum whose topics carry skill keys, prerequisites, depths,
 * directions and mandatory flags from the moment they are written. That is what makes the
 * adaptive planner able to do anything at all: an unmapped curriculum personalises into a list
 * of topics nobody can measure.
 *
 * DAY RANGES ARE A PLACEHOLDER, AND SAY SO. The adaptive plan decides pace from the student's
 * availability, not from authored day numbers. The ranges exist because LearningCurriculum
 * requires them and the legacy day-plan screens read them — they are not what the new planner
 * uses, and treating them as a schedule would be reading meaning into a required field.
 *
 * IDEMPOTENT AND DRY-RUN BY DEFAULT. Re-running updates the same document rather than creating
 * a second one; a seed that duplicates is a seed nobody points at real data twice.
 *
 *   npx ts-node src/seeds/careerPilot/createFoundationCurriculum.ts <tenantId>
 *   npx ts-node src/seeds/careerPilot/createFoundationCurriculum.ts <tenantId> --apply
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import LearningCurriculum from '../../models/LearningCurriculum';
import CareerSkill from '../../models/CareerSkill';
import { FOUNDATION_MODULES, referencedSkillKeys, isMandatoryCategory } from './foundationSkillMap';

dotenv.config();

/** The title this seed owns. Matching on it is what makes re-runs update rather than duplicate. */
export const FOUNDATION_TITLE = 'CareerPilot Year 1 — Foundation';

/** Placeholder days per topic. See the note above: the adaptive planner does not read these. */
const DAYS_PER_TOPIC = 3;

const COLOURS = ['#3b82f6', '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#14b8a6'];

export interface CreateReport {
  created: boolean;
  updated: boolean;
  curriculumId?: string;
  topics: number;
  mappedTopics: number;
  mandatory: number;
  directionScoped: number;
  totalDays: number;
  unknownSkillKeys: string[];
}

export async function createFoundationCurriculum(opts: {
  tenantId: string;
  apply?: boolean;
  createdBy?: string;
}): Promise<CreateReport> {
  const report: CreateReport = {
    created: false, updated: false, topics: 0, mappedTopics: 0,
    mandatory: 0, directionScoped: 0, totalDays: 0, unknownSkillKeys: [],
  };

  /**
   * Validate every skill BEFORE writing, exactly as the mapping seed does.
   *
   * A curriculum whose topics point at skills that do not exist is worse than no curriculum:
   * it generates a plan full of topics the planner cannot measure, and looks like it worked.
   */
  const wanted = referencedSkillKeys();
  const known = await CareerSkill.find({ key: { $in: wanted } }).select('key').lean() as any[];
  const knownSet = new Set(known.map(k => String(k.key).toUpperCase()));
  report.unknownSkillKeys = wanted.filter(k => !knownSet.has(k.toUpperCase()));
  if (report.unknownSkillKeys.length) return report;

  // Flatten modules into topics, laying days out end to end.
  let cursor = 1;
  let order = 0;
  const topics: any[] = [];

  for (let mi = 0; mi < FOUNDATION_MODULES.length; mi++) {
    const m = FOUNDATION_MODULES[mi];
    for (const t of m.topics) {
      const mandatory = isMandatoryCategory(t.category);
      topics.push({
        title: t.title,
        description: `${m.moduleName} · ${t.learningOutcomes[0] || ''}`.trim(),
        order: order++,
        startDay: cursor,
        endDay: cursor + DAYS_PER_TOPIC - 1,
        color: COLOURS[mi % COLOURS.length],
        // Adaptive fields — the entire reason this curriculum is worth creating.
        moduleCode: m.moduleCode,
        topicCode: t.topicCode,
        skillKeys: t.skillKeys,
        prerequisiteSkillKeys: t.prerequisiteSkillKeys || [],
        defaultDepth: t.defaultDepth,
        mandatory,
        applicableDirections: t.applicableDirections,
        learningOutcomes: t.learningOutcomes,
      });
      cursor += DAYS_PER_TOPIC;
      if (t.skillKeys.length) report.mappedTopics++;
      if (mandatory) report.mandatory++;
      if (t.applicableDirections.length) report.directionScoped++;
    }
  }

  report.topics = topics.length;
  report.totalDays = cursor - 1;

  const existing = await LearningCurriculum.findOne({
    tenantId: opts.tenantId, title: FOUNDATION_TITLE,
  });

  if (!opts.apply) {
    report.created = !existing;
    report.updated = !!existing;
    report.curriculumId = existing ? String(existing._id) : undefined;
    return report;
  }

  if (existing) {
    existing.set({ topics, totalDays: report.totalDays, isPublished: true });
    await existing.save();
    report.updated = true;
    report.curriculumId = String(existing._id);
  } else {
    const created = await LearningCurriculum.create({
      tenantId: opts.tenantId,
      title: FOUNDATION_TITLE,
      description: 'The universal first-year foundation, plus the direction a student is currently '
        + 'heading in. What each student is actually assigned depends on what they have been '
        + 'measured on — this is the full set it draws from.',
      targetCourse: 'B.Tech Year 1',
      totalDays: report.totalDays,
      topics,
      isPublished: true,
      createdBy: opts.createdBy || 'foundation-seed',
    });
    report.created = true;
    report.curriculumId = String(created._id);
  }

  return report;
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

if (require.main === module) {
  (async () => {
    const tenantId = process.argv[2];
    const apply = process.argv.includes('--apply');
    if (!tenantId) {
      console.error('Usage: createFoundationCurriculum.ts <tenantId> [--apply]');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
    const r = await createFoundationCurriculum({ tenantId, apply });

    if (r.unknownSkillKeys.length) {
      console.error('\nREFUSED — these skill keys do not exist in the taxonomy:');
      for (const k of r.unknownSkillKeys) console.error('  ' + k);
      console.error('\nSeed the taxonomy first:  npx ts-node src/scripts/seedCareerSkills.ts --apply');
      await mongoose.disconnect();
      process.exit(1);
    }

    console.log(`\n${FOUNDATION_TITLE}`);
    console.log(`  modules          : ${FOUNDATION_MODULES.length}`);
    console.log(`  topics           : ${r.topics}  (${r.mappedTopics} mapped to skills)`);
    console.log(`  everyone learns  : ${r.mandatory}`);
    console.log(`  direction-scoped : ${r.directionScoped}`);
    console.log(`  placeholder days : ${r.totalDays}`);
    if (apply) {
      console.log(`\n${r.created ? 'CREATED' : 'UPDATED'}  curriculumId = ${r.curriculumId}`);
      console.log('\nNext — build a student a plan from it:');
      console.log(`  POST /api/v1/adaptive/students/<studentId>/plan/${r.curriculumId}/generate`);
      console.log(`  then open  /my-learning/foundation/${r.curriculumId}`);
    } else {
      console.log(`\nDRY RUN — would ${r.updated ? 'update the existing' : 'create a new'} curriculum.`);
      console.log('Pass --apply to write.');
    }

    await mongoose.disconnect();
  })().catch(e => { console.error('ERR', e.message); process.exit(1); });
}
