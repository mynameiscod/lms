/**
 * Why is this tenant's Year 2, 3 or 4 student getting the OLD roadmap?
 *
 * READ-ONLY. This script writes nothing, anywhere, ever. It is safe on production.
 *
 *   npx ts-node src/scripts/diagnoseCareerPilotEngine.ts <tenantId>
 *
 * In production, against the compiled build:
 *   docker exec lms-server-<slot> node dist/scripts/diagnoseCareerPilotEngine.js <tenantId>
 *
 * ── WHAT IT IS FOR ────────────────────────────────────────────────────────────────────────
 *
 * A second-year was shown "Your Learning Roadmap · Foundation → Build → Placement, Day 1/90" —
 * the TOPIC engine's pathway roadmap — while the sidebar beside it correctly said "My 110 Days".
 * Two answers to one question, which is the exact failure the engine gate was built to prevent.
 *
 * There are two candidate causes and they need completely different fixes:
 *
 *   THE SWITCH. `foundation` is on the unit engine unconditionally; every other stage reaches it
 *   only where a tenant has opted in, by student id, by stage, or by the tenant switch. A
 *   production tenant where nobody opted in serves Years 2-4 from the topic engine, which is
 *   working as designed and looks exactly like a broken deployment.
 *
 *   THE CONTENT. Even with the switch on, a stage with fewer PUBLISHED units than its programme
 *   has days cannot compose, and the student is told their curriculum is not set up.
 *
 * Flipping the switch when the cause was the content turns a wrong roadmap into no roadmap. So
 * this reports BOTH, per stage, and states which one is in the way.
 *
 * ── WHAT IT DOES NOT DO ───────────────────────────────────────────────────────────────────
 *
 * It does not compose a journey. Composition is the expensive, stateful part, and the questions
 * here are all cheap counts — a script that is safe to run on production during business hours
 * is worth more than one that proves slightly more and nobody dares run.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import PassportConfig from '../models/PassportConfig';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import LearningCurriculum from '../models/LearningCurriculum';
import SkillEvidence from '../models/SkillEvidence';
import StageSkillSet from '../models/StageSkillSet';
import RoleSkillBlueprint from '../models/RoleSkillBlueprint';
import User from '../models/User';
import { effectiveCurriculumEngine, UNIT_ENGINE_STAGES } from '../data/curriculumEnginePolicy';
import { programDaysFor } from '../services/foundationProgramLengthService';
import { FOUNDATION_JOURNEY_KIND } from '../services/foundationJourneyService';

const STAGES = ['foundation', 'build', 'specialize', 'placement'] as const;
const PAD = 13;

/** A Mongoose Map reads back as a Map from the ODM and as a plain object from `.lean()`. */
const mapOf = (v: any): Record<string, any> => {
  if (!v) return {};
  if (v instanceof Map) return Object.fromEntries(v);
  return typeof v === 'object' ? { ...v } : {};
};

const row = (label: string, cells: (string | number)[]) =>
  `  ${label.padEnd(30)}${cells.map(c => String(c).padStart(PAD)).join('')}`;

async function run(): Promise<void> {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error('Usage: diagnoseCareerPilotEngine.ts <tenantId>');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) { console.error('MONGODB_URI is not set'); process.exit(1); }
  await mongoose.connect(uri);

  console.log(`\nCAREERPILOT ENGINE DIAGNOSIS  ·  tenant ${tenantId}`);
  console.log('READ-ONLY — this script writes nothing.\n');

  /* ── 1. The switches ──────────────────────────────────────────────────────────────────── */

  const cfg = await PassportConfig.findOne({ tenantId }).lean() as any;
  console.log('1. THE ENGINE SWITCHES');
  if (!cfg) {
    console.log('   NO PassportConfig FOR THIS TENANT.');
    console.log('   Every stage falls to TOPIC by default, including any that has content.\n');
  } else {
    const stages = cfg.megaCurriculumStages || [];
    const ids = cfg.megaCurriculumStudentIds || [];
    console.log(`   megaCurriculumEnabled     ${cfg.megaCurriculumEnabled === true}`);
    console.log(`   megaCurriculumStages      [${stages.join(', ') || '(empty)'}]`);
    console.log(`   megaCurriculumStudentIds  ${ids.length} id(s)`);
    console.log(`   programDaysByStage        ${JSON.stringify(mapOf(cfg.programDaysByStage))}`);
    console.log(`   foundationProgramDays     ${cfg.foundationProgramDays ?? '(unset)'}`);
    console.log(`   priceInr                  ${cfg.priceInr ?? '(unset)'}`);
    console.log(`   priceInrByStage           ${JSON.stringify(mapOf(cfg.priceInrByStage))}`);
    console.log('');
  }

  /* ── 2. What each stage resolves to, for a student with no personal override ──────────── */

  console.log('2. WHICH ENGINE EACH STAGE RESOLVES TO  (a student not named in the id list)');
  for (const stage of STAGES) {
    const e = effectiveCurriculumEngine({ config: cfg, studentId: null, stageKey: stage });
    const mark = e.engine === 'UNIT' ? 'UNIT ' : 'TOPIC';
    console.log(`   ${stage.padEnd(12)} ${mark}   basis=${e.basis}`);
  }
  console.log('');

  /* ── 3. Content, per stage ────────────────────────────────────────────────────────────── */

  const skillCheckMappings = await SkillEvidence.countDocuments({
    tenantId, active: true, contribution: 'PRIMARY',
  });

  const facts: Record<string, any> = {};
  for (const stage of STAGES) {
    const [total, published, template, skillSet, journeys] = await Promise.all([
      CurriculumLearningUnit.countDocuments({ tenantId, stageKey: stage }),
      CurriculumLearningUnit.countDocuments({ tenantId, stageKey: stage, status: 'PUBLISHED' }),
      LearningCurriculum.findOne({ tenantId, adaptiveStage: stage, personalizedFor: null })
        .select('topics.topicCode topics.backbone').lean() as any,
      StageSkillSet.findOne({ tenantId, stage }).select('requirements').lean() as any,
      LearningCurriculum.countDocuments({
        tenantId, adaptiveStage: stage, journeyKind: FOUNDATION_JOURNEY_KIND,
        personalizedFor: { $ne: null },
      }),
    ]);
    /* The stage's OWN programme length. foundationReadiness asks for Foundation's, which is a
       separate defect; reporting the right number here keeps this script honest about the gap. */
    const days = await programDaysFor(tenantId, stage);
    const topics = (template?.topics || []) as any[];
    facts[stage] = {
      total, published, days,
      topics: topics.length,
      backbone: topics.filter(t => t.backbone === true).length,
      skills: (skillSet?.requirements || []).length,
      journeys,
    };
  }

  console.log('3. CONTENT, PER STAGE');
  console.log(row('', STAGES as unknown as string[]));
  console.log(row('units (any status)', STAGES.map(s => facts[s].total)));
  console.log(row('units PUBLISHED', STAGES.map(s => facts[s].published)));
  console.log(row('programme days needed', STAGES.map(s => facts[s].days)));
  console.log(row('stage template topics', STAGES.map(s => facts[s].topics)));
  console.log(row('  of which backbone', STAGES.map(s => facts[s].backbone)));
  console.log(row('stage skill set reqs', STAGES.map(s => facts[s].skills)));
  console.log(row('journeys already written', STAGES.map(s => facts[s].journeys)));
  console.log(`\n   PRIMARY skill-evidence mappings (tenant-wide): ${skillCheckMappings}`);
  if (!skillCheckMappings) {
    console.log('   ZERO — no learner on ANY stage can be measured, so no journey is ever created.');
  }
  console.log('');

  /* ── 4. Students waiting on this ──────────────────────────────────────────────────────── */

  /**
   * User.tenantId is an ObjectId. Every other CareerPilot model uses a String.
   *
   * A `find` casts the string for you because the schema says ObjectId; an AGGREGATE does not —
   * `$match` is handed to the server as written. So the string form returns zero users and no
   * error, which reads as "this tenant has no students" on a tenant with seventy. Measured on
   * production: string 0, ObjectId 70.
   */
  const tenantOid = mongoose.Types.ObjectId.isValid(tenantId)
    ? new mongoose.Types.ObjectId(tenantId) : null;
  const byStage = tenantOid ? await User.aggregate([
    { $match: { tenantId: tenantOid, 'passport.stage': { $exists: true, $ne: null } } },
    { $group: { _id: '$passport.stage', n: { $sum: 1 } } },
  ]) : [];
  console.log('4. STUDENTS BY STAGE');
  if (!byStage.length) console.log('   none with a stage set.');
  for (const s of byStage.sort((a: any, b: any) => String(a._id).localeCompare(String(b._id)))) {
    const stage = String(s._id);
    const f = facts[stage];
    const note = f ? `  (${f.journeys} have a unit journey)` : '  (not a unit-engine stage)';
    console.log(`   ${stage.padEnd(14)} ${String(s.n).padStart(5)}${note}`);
  }
  console.log('');

  /* ── 5. Role blueprints — the other reason an assessment refuses ──────────────────────── */

  const blueprints = await RoleSkillBlueprint.find({ tenantId }).select('roleKey published').lean() as any[];
  console.log('5. ROLE BLUEPRINTS');
  console.log(`   ${blueprints.length} present, ${blueprints.filter(b => b.published).length} published.`);
  if (!blueprints.filter(b => b.published).length) {
    console.log('   NONE PUBLISHED — every student who names a role is refused an assessment,');
    console.log('   and with no Skill DNA there is nothing to compose a roadmap from.');
  }
  console.log('');

  /* ── 6. The verdict, per stage ────────────────────────────────────────────────────────── */

  console.log('6. WHAT IS IN THE WAY, PER STAGE');
  for (const stage of STAGES) {
    const f = facts[stage];
    const e = effectiveCurriculumEngine({ config: cfg, studentId: null, stageKey: stage });
    const contentOk = f.published >= f.days;
    const blockers: string[] = [];
    if (e.engine !== 'UNIT') blockers.push(`SWITCH OFF (${e.basis})`);
    if (!contentOk) blockers.push(`CONTENT SHORT (${f.published} published, needs ${f.days})`);
    if (!skillCheckMappings) blockers.push('NO SKILL CHECK');
    if (!UNIT_ENGINE_STAGES.includes(stage)) blockers.push('STAGE NOT CAPABLE');

    if (!blockers.length) {
      console.log(`   ${stage.padEnd(12)} READY — the unit engine plans this stage.`);
    } else {
      console.log(`   ${stage.padEnd(12)} BLOCKED: ${blockers.join('  +  ')}`);
    }
  }

  console.log('\n   SWITCH OFF alone      -> a config change; the content is already there.');
  console.log('   CONTENT SHORT present -> do NOT flip the switch yet; it turns a wrong');
  console.log('                            roadmap into "your curriculum is not set up".');
  console.log('');

  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('\nFAILED:', e?.message || e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
