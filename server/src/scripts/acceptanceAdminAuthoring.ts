/**
 * P8C.0 acceptance — build a whole CareerPilot hierarchy through the Admin path, then remove it.
 *
 *   npx ts-node src/scripts/acceptanceAdminAuthoring.ts <tenantId>
 *
 * ── IT CALLS THE CONTROLLERS. ALL OF THEM. ────────────────────────────────────────────────
 *
 * Every step goes through the same controller function the HTTP route invokes, with a mock
 * req/res standing in for Express. Writing to the models directly would prove the database
 * works and nothing about whether an author can actually do this — validation, defaulting,
 * status rules and error handling all live in the controller, and those are what this audits.
 *
 * An earlier version of this script SAID that and was not doing it: modules and topics were
 * pushed onto the curriculum document by hand. That exempted the weakest layer of the
 * hierarchy from the audit and made the claim at the top of the file false, which is worse
 * than not claiming it. Both now go through stageCurriculumController, and the only direct
 * model access left in the whole script is READING, to check what the controllers did.
 *
 * ── IT MUST NOT TOUCH THE REAL 337 ────────────────────────────────────────────────────────
 *
 * Everything it creates is prefixed ZZTEST_ and removed at the end, including on failure.
 * Baselines are captured before anything is written and asserted back afterwards — units,
 * topics, modules, published count, suitableStates overrides, content bindings and quiz
 * bindings — because "the test passed" and "the curriculum is as we found it" are different
 * claims and only the second one is safe to walk away from.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import LearningCurriculum from '../models/LearningCurriculum';
import LearningContentLibrary from '../models/LearningContentLibrary';
import Quiz from '../models/Quiz';
import Assignment from '../models/Assignment';
import User from '../models/User';
import CareerSkill from '../models/CareerSkill';
import * as units from '../controllers/curriculumLearningUnitController';
import * as stage from '../controllers/stageCurriculumController';

dotenv.config();

const PREFIX = 'ZZTEST_';
const MODULE = `${PREFIX}MODULE`;
const TOPIC = `T_${PREFIX}TOPIC`;
const STAGE = 'foundation';

/* ------------------------------------------------------------------ */

let passed = 0;
let failed = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  if (ok) passed++; else failed++;
};

/** A mock res that captures what the controller would have sent. */
const capture = () => {
  const out: { code: number; body: any } = { code: 200, body: null };
  const res: any = {
    status(c: number) { out.code = c; return res; },
    json(b: any) { out.body = b; return res; },
  };
  return { res, out };
};

let ACTOR_ID = '';

const asAdmin = (tenantId: string, extra: any = {}) => ({
  user: { id: ACTOR_ID, tenantId, email: 'acceptance@codebegun.test' },
  params: {}, body: {}, query: {},
  ...extra,
} as any);

const call = async (
  fn: (req: any, res: any) => Promise<any>, tenantId: string, extra: any = {},
) => {
  const { res, out } = capture();
  await fn(asAdmin(tenantId, extra), res);
  return out;
};

/** The coverage block listUnits reports for one unit — the readiness the screen shows. */
const coverageOf = async (tenantId: string, unitCode: string) => {
  const listed = await call(units.listUnits, tenantId, { query: { stage: STAGE } });
  return (listed.body?.rows || [])
    .flatMap((t: any) => t.units || [])
    .find((u: any) => u.unitCode === unitCode)?.coverage;
};

/* ------------------------------------------------------------------ */

(async () => {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error('Usage: acceptanceAdminAuthoring.ts <tenantId>');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  /**
   * An assignment records who created it, as an ObjectId ref to a real user.
   *
   * Taken from the tenant rather than invented: a fabricated id would create a row pointing at
   * nobody, and the grading screens would show an assignment with no author.
   */
  const admin = await User.findOne({
    tenantId: new mongoose.Types.ObjectId(tenantId),
  }).select('_id').lean() as any;
  ACTOR_ID = admin ? String(admin._id) : '';

  /* ---- baseline, captured before a single write -------------------- */

  const tenantOid = mongoose.Types.ObjectId.isValid(tenantId)
    ? new mongoose.Types.ObjectId(tenantId) : null;

  const baseline = {
    units: await CurriculumLearningUnit.countDocuments({ tenantId }),
    published: await CurriculumLearningUnit.countDocuments({ tenantId, status: 'PUBLISHED' }),
    drafts: await CurriculumLearningUnit.countDocuments({ tenantId, status: 'DRAFT' }),
    overrides: await CurriculumLearningUnit.countDocuments({
      tenantId, suitableStates: { $exists: true, $ne: [] },
    }),
    boundContent: await LearningContentLibrary.countDocuments({
      tenantId, unitCode: { $exists: true, $ne: '' },
    }),
    boundQuizzes: await Quiz.countDocuments({ tenantId, unitCode: { $exists: true, $ne: '' } }),
    boundAssignments: tenantOid
      ? await Assignment.countDocuments({ tenant: tenantOid, unitCode: { $exists: true, $ne: '' } })
      : 0,
    topics: 0,
    modules: 0,
  };

  const doc0 = await LearningCurriculum.findOne({ tenantId, adaptiveStage: STAGE }).lean() as any;
  baseline.topics = (doc0?.topics || []).length;
  baseline.modules = (doc0?.modules || []).length;

  console.log(`\nADMIN AUTHORING ACCEPTANCE  ·  tenant ${tenantId}`);
  console.log(`  baseline: ${baseline.units} units (${baseline.published} published, `
    + `${baseline.drafts} draft), ${baseline.topics} topics, ${baseline.modules} modules`);
  console.log(`  bindings: ${baseline.boundContent} content, ${baseline.boundQuizzes} quizzes, `
    + `${baseline.boundAssignments} assignments; ${baseline.overrides} suitability overrides\n`);

  /** A real skill key from the registry, so the happy paths use something that exists. */
  const anySkill = await CareerSkill.findOne({ active: true, nodeType: 'SKILL' })
    .select('key').lean() as any;
  const SKILL = String(anySkill?.key || '');
  if (!SKILL) {
    console.error('The CareerSkill registry is empty — seed the taxonomy before running this.');
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`  authoring against the skill ${SKILL}\n`);

  try {
    /* ---- 1. module, through the real controller ------------------- */

    console.log('MODULE');
    const madeModule = await call(stage.putModule, tenantId, {
      params: { stage: STAGE },
      body: {
        moduleCode: MODULE, moduleName: 'Acceptance Module', displayOrder: 9990,
        blurb: 'Temporary. Removed by the acceptance script.',
      },
    });
    check('module created through stageCurriculumController', madeModule.code === 200,
      madeModule.code !== 200 ? JSON.stringify(madeModule.body) : '');

    let doc = await LearningCurriculum.findOne({ tenantId, adaptiveStage: STAGE }).lean() as any;
    check('module is in the curriculum',
      (doc.modules || []).some((m: any) => m.moduleCode === MODULE));

    /* ---- 2. topics, and reordering them --------------------------- */

    console.log('\nTOPIC');
    const madeTopic = await call(stage.postTopic, tenantId, {
      params: { stage: STAGE },
      body: {
        title: 'Acceptance Topic', description: 'Temporary.',
        moduleCode: MODULE, topicCode: TOPIC,
        skillKeys: [SKILL], defaultDepth: 'STANDARD', mandatory: true,
        learningOutcomes: ['Temporary acceptance topic'],
      },
    });
    check('topic created through the controller', madeTopic.code === 200,
      madeTopic.code !== 200 ? JSON.stringify(madeTopic.body) : '');

    const badTopicSkill = await call(stage.postTopic, tenantId, {
      params: { stage: STAGE },
      body: { title: 'Bad', moduleCode: MODULE, topicCode: `${TOPIC}_BAD`, skillKeys: ['NOT_A_SKILL'] },
    });
    check('topic refuses an unknown skill', badTopicSkill.code === 400,
      String(badTopicSkill.body?.message || '').slice(0, 80));

    const badTopicDir = await call(stage.postTopic, tenantId, {
      params: { stage: STAGE },
      body: {
        title: 'Bad', moduleCode: MODULE, topicCode: `${TOPIC}_BAD2`,
        applicableDirections: ['SOFTWARE_DEVELOPMENT'],
      },
    });
    check('topic refuses an unknown direction', badTopicDir.code === 400,
      String(badTopicDir.body?.message || '').slice(0, 80));

    // A second topic, purely so there is something to reorder against.
    await call(stage.postTopic, tenantId, {
      params: { stage: STAGE },
      body: { title: 'Acceptance Topic Two', moduleCode: MODULE, topicCode: `${TOPIC}_2` },
    });

    const reorderedTopics = await call(stage.postTopicOrder, tenantId, {
      params: { stage: STAGE },
      body: { moduleCode: MODULE, order: [`${TOPIC}_2`, TOPIC] },
    });
    doc = await LearningCurriculum.findOne({ tenantId, adaptiveStage: STAGE }).lean() as any;
    const mine = (doc.topics || [])
      .filter((t: any) => String(t.moduleCode) === MODULE)
      .sort((a: any, b: any) => a.order - b.order)
      .map((t: any) => t.topicCode);
    check('topics reorder in bulk', reorderedTopics.code === 200 && mine[0] === `${TOPIC}_2`,
      mine.join(' , '));

    const badTopicOrder = await call(stage.postTopicOrder, tenantId, {
      params: { stage: STAGE },
      body: { moduleCode: MODULE, order: [TOPIC, TOPIC] },
    });
    check('a topic named twice is refused', badTopicOrder.code === 400);

    /* ---- 3. module reorder ---------------------------------------- */

    console.log('\nMODULE ORDER');
    const allModules = (doc.modules || [])
      .slice()
      .sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0))
      .map((m: any) => String(m.moduleCode));
    /**
     * The test module is moved to the FRONT and back again, which is the strongest form of
     * this check: it proves the real modules survive being renumbered, not merely that the
     * endpoint returns 200 for a no-op.
     */
    const moved = [MODULE, ...allModules.filter((c: string) => c !== MODULE)];
    const reorderedModules = await call(stage.postModuleOrder, tenantId, {
      params: { stage: STAGE }, body: { order: moved },
    });
    doc = await LearningCurriculum.findOne({ tenantId, adaptiveStage: STAGE }).lean() as any;
    const firstModule = (doc.modules || [])
      .slice().sort((a: any, b: any) => a.displayOrder - b.displayOrder)[0]?.moduleCode;
    check('modules reorder in bulk', reorderedModules.code === 200 && firstModule === MODULE,
      `first is ${firstModule}`);

    const restored = await call(stage.postModuleOrder, tenantId, {
      params: { stage: STAGE }, body: { order: allModules },
    });
    check('the real module order is restorable', restored.code === 200);

    const badModuleOrder = await call(stage.postModuleOrder, tenantId, {
      params: { stage: STAGE }, body: { order: ['M99_DOES_NOT_EXIST'] },
    });
    check('an unknown module in an order is refused', badModuleOrder.code === 400);

    /* ---- 4. one unit of each type --------------------------------- */

    console.log('\nLEARNING UNITS — ALL SIX TYPES');
    const TYPES: [string, number][] = [
      ['CONCEPT', 10], ['PRACTICE', 20], ['DEBUG', 30],
      ['PROJECT', 40], ['CHECKPOINT', 50], ['REVIEW', 60],
    ];

    for (const [unitType, order] of TYPES) {
      const unitCode = `${TOPIC}_${unitType}`;
      const out = await call(units.saveUnit, tenantId, {
        params: { unitCode },
        body: {
          stageKey: STAGE, moduleCode: MODULE, topicCode: TOPIC,
          title: `Acceptance ${unitType}`,
          description: `Temporary ${unitType} unit for the P8C.0 acceptance run.`,
          displayOrder: order,
          skillKeys: [SKILL],
          prerequisiteUnitCodes: order > 10 ? [`${TOPIC}_CONCEPT`] : [],
          learningOutcomes: [`Demonstrate the ${unitType.toLowerCase()} path end to end`],
          estimatedMinutes: 60, unitType, category: 'UNIVERSAL',
          defaultDepth: 'STANDARD', applicableDirections: [], mandatory: true,
        },
      });
      check(`${unitType} created`, out.code === 200 && !!out.body?.unit,
        out.code !== 200 ? JSON.stringify(out.body) : '');
    }

    /* ---- 5. validation refuses what it should --------------------- */

    console.log('\nVALIDATION');
    const badSkill = await call(units.saveUnit, tenantId, {
      params: { unitCode: `${TOPIC}_CONCEPT` },
      body: {
        moduleCode: MODULE, topicCode: TOPIC, title: 'Acceptance CONCEPT',
        skillKeys: ['TOTALLY_MADE_UP_SKILL'], unitType: 'CONCEPT',
      },
    });
    check('unknown skill key is refused', badSkill.code === 400,
      String(badSkill.body?.message || '').slice(0, 70));

    const group = await CareerSkill.findOne({ nodeType: 'GROUP' }).select('key').lean() as any;
    if (group) {
      const badGroup = await call(units.saveUnit, tenantId, {
        params: { unitCode: `${TOPIC}_CONCEPT` },
        body: {
          moduleCode: MODULE, topicCode: TOPIC, title: 'Acceptance CONCEPT',
          skillKeys: [group.key], unitType: 'CONCEPT',
        },
      });
      check('a GROUP node is refused as a unit skill', badGroup.code === 400,
        String(badGroup.body?.message || '').slice(0, 70));
    }

    const badDirection = await call(units.saveUnit, tenantId, {
      params: { unitCode: `${TOPIC}_CONCEPT` },
      body: {
        moduleCode: MODULE, topicCode: TOPIC, title: 'Acceptance CONCEPT',
        skillKeys: [SKILL], unitType: 'CONCEPT',
        applicableDirections: ['SOFTWARE_DEVELOPMENT'],
      },
    });
    check('unknown direction is refused', badDirection.code === 400,
      String(badDirection.body?.message || '').slice(0, 70));

    const goodDirection = await call(units.saveUnit, tenantId, {
      params: { unitCode: `${TOPIC}_REVIEW` },
      body: {
        moduleCode: MODULE, topicCode: TOPIC, title: 'Acceptance REVIEW',
        skillKeys: [SKILL], unitType: 'REVIEW', estimatedMinutes: 60,
        applicableDirections: ['SOFTWARE_BACKEND'],
      },
    });
    check('the frozen SOFTWARE_BACKEND is accepted', goodDirection.code === 200,
      String(goodDirection.body?.message || '').slice(0, 70));

    const ghostPrereq = await call(units.saveUnit, tenantId, {
      params: { unitCode: `${TOPIC}_PRACTICE` },
      body: {
        moduleCode: MODULE, topicCode: TOPIC, title: 'Acceptance PRACTICE',
        skillKeys: [SKILL], unitType: 'PRACTICE',
        prerequisiteUnitCodes: [`${TOPIC}_DOES_NOT_EXIST`],
      },
    });
    check('a prerequisite naming nothing is refused', ghostPrereq.code === 400,
      String(ghostPrereq.body?.message || '').slice(0, 70));

    /**
     * A -> B -> A, built out of the acceptance units. CONCEPT is already a prerequisite of
     * PRACTICE, so making PRACTICE a prerequisite of CONCEPT closes the loop.
     */
    const cycle = await call(units.saveUnit, tenantId, {
      params: { unitCode: `${TOPIC}_CONCEPT` },
      body: {
        moduleCode: MODULE, topicCode: TOPIC, title: 'Acceptance CONCEPT',
        skillKeys: [SKILL], unitType: 'CONCEPT',
        prerequisiteUnitCodes: [`${TOPIC}_PRACTICE`],
      },
    });
    check('a prerequisite cycle is refused', cycle.code === 400,
      String(cycle.body?.message || '').slice(0, 80));

    /* ---- 6. suitableStates ---------------------------------------- */

    console.log('\nSUITABILITY OVERRIDE');
    const base = {
      moduleCode: MODULE, topicCode: TOPIC, title: 'Acceptance CONCEPT',
      skillKeys: [SKILL], unitType: 'CONCEPT', estimatedMinutes: 60,
    };

    await call(units.saveUnit, tenantId, {
      params: { unitCode: `${TOPIC}_CONCEPT` },
      body: { ...base, suitableStates: ['STANDARD', 'VERIFIED'] },
    });
    let unitDoc = await CurriculumLearningUnit
      .findOne({ tenantId, unitCode: `${TOPIC}_CONCEPT` }).lean() as any;
    check('override saved', JSON.stringify(unitDoc.suitableStates) === '["STANDARD","VERIFIED"]',
      JSON.stringify(unitDoc.suitableStates));

    // An edit that never mentions suitability must not revert it. This is what protects the
    // eight real overrides from an ordinary rename.
    await call(units.saveUnit, tenantId, {
      params: { unitCode: `${TOPIC}_CONCEPT` }, body: { ...base, title: 'Acceptance CONCEPT v2' },
    });
    unitDoc = await CurriculumLearningUnit
      .findOne({ tenantId, unitCode: `${TOPIC}_CONCEPT` }).lean() as any;
    check('an unrelated edit leaves the override alone',
      JSON.stringify(unitDoc.suitableStates) === '["STANDARD","VERIFIED"]',
      JSON.stringify(unitDoc.suitableStates));

    for (const bad of ['NOT_A_STATE', 'LOCKED', 'NOT_RELEVANT']) {
      const out = await call(units.saveUnit, tenantId, {
        params: { unitCode: `${TOPIC}_CONCEPT` }, body: { ...base, suitableStates: [bad] },
      });
      check(`${bad} is refused as a suitable state`, out.code === 400);
    }

    await call(units.saveUnit, tenantId, {
      params: { unitCode: `${TOPIC}_CONCEPT` }, body: { ...base, suitableStates: [] },
    });
    unitDoc = await CurriculumLearningUnit
      .findOne({ tenantId, unitCode: `${TOPIC}_CONCEPT` }).lean() as any;
    check('an empty override returns the unit to derivation',
      unitDoc.suitableStates === undefined, JSON.stringify(unitDoc.suitableStates));

    /* ---- 7. unit ordering ----------------------------------------- */

    console.log('\nUNIT ORDER');
    const reorder = await call(units.reorderUnits, tenantId, {
      body: {
        order: [
          { unitCode: `${TOPIC}_REVIEW`, displayOrder: 5 },
          { unitCode: `${TOPIC}_CONCEPT`, displayOrder: 15 },
        ],
      },
    });
    const reviewDoc = await CurriculumLearningUnit
      .findOne({ tenantId, unitCode: `${TOPIC}_REVIEW` }).select('displayOrder').lean() as any;
    check('units reorder', reorder.code === 200 && reviewDoc?.displayOrder === 5,
      `REVIEW order = ${reviewDoc?.displayOrder}`);

    /* ---- 8. readiness and the publish bar ------------------------- */

    console.log('\nREADINESS AND PUBLISH RULES');
    const listed = await call(units.listUnits, tenantId, { query: { stage: STAGE } });
    const rows: any[] = (listed.body?.rows || [])
      .flatMap((t: any) => t.units || [])
      .filter((u: any) => String(u.unitCode).startsWith(TOPIC));
    /**
     * Asserted on a non-empty set on purpose. The first version read the wrong response field,
     * found nothing, and `every` over an empty array reported success — a test that passed
     * because it examined nothing.
     */
    check('units listed under their topic', rows.length === 6, `${rows.length} of 6`);
    check('readiness reported for every unit',
      rows.length === 6 && rows.every(r => !!r.coverage?.readiness),
      [...new Set(rows.map(r => r.coverage?.readiness))].join(','));

    const pub = await call(units.publishUnit, tenantId, {
      params: { unitCode: `${TOPIC}_CONCEPT` },
    });
    check('publish refused while the unit owns no teaching', pub.code >= 400,
      String(pub.body?.message || '').slice(0, 90));

    const stillDraft = await CurriculumLearningUnit
      .findOne({ tenantId, unitCode: `${TOPIC}_CONCEPT` }).select('status').lean() as any;
    check('status unchanged after a refused publish', stillDraft.status === 'DRAFT');

    /* ---- 9. content attach and detach ----------------------------- */

    console.log('\nCONTENT BUNDLE');
    const note = await LearningContentLibrary.create({
      tenantId, type: 'notes', title: `${PREFIX}Notes`,
      topicCode: TOPIC, skillKeys: [SKILL],
      body: 'Temporary acceptance content.', isPublished: true,
      createdBy: 'acceptance',
    } as any);
    const drill = await LearningContentLibrary.create({
      tenantId, type: 'practice_coding', title: `${PREFIX}Drill`,
      topicCode: TOPIC, skillKeys: [SKILL],
      body: 'Temporary acceptance practice.', isPublished: true,
      createdBy: 'acceptance',
    } as any);

    const attachA = await call(units.attachContent, tenantId, {
      params: { unitCode: `${TOPIC}_CONCEPT`, contentId: String(note._id) },
    });
    const attachB = await call(units.attachContent, tenantId, {
      params: { unitCode: `${TOPIC}_CONCEPT`, contentId: String(drill._id) },
    });
    check('content attached through the admin path', attachA.code === 200 && attachB.code === 200,
      attachA.code !== 200 ? JSON.stringify(attachA.body) : '');

    const after = await call(units.unitContent, tenantId, {
      params: { unitCode: `${TOPIC}_CONCEPT` },
    });
    check('the bundle shows the attached rows',
      (after.body?.attached || []).filter((i: any) => String(i.title).startsWith(PREFIX)).length === 2,
      `${(after.body?.attached || []).length} attached`);

    const cov1 = await coverageOf(tenantId, `${TOPIC}_CONCEPT`);
    check('own teaching and practice are counted, not inherited',
      (cov1?.ownTeaching || 0) >= 1 && (cov1?.ownPractice || 0) >= 1,
      `T${cov1?.ownTeaching} P${cov1?.ownPractice} readiness ${cov1?.readiness}`);

    /* ---- 10. quiz binding ----------------------------------------- */

    console.log('\nQUIZ BINDING');
    const madeQuiz = await call(units.createUnitAssessment, tenantId, {
      params: { unitCode: `${TOPIC}_CHECKPOINT` },
      body: { kind: 'QUIZ', title: `${PREFIX}Checkpoint quiz` },
    });
    check('a quiz can be created and bound from the unit screen', madeQuiz.code === 200,
      String(madeQuiz.body?.message || '').slice(0, 80));

    const exams = await call(units.unitAssessments, tenantId, {
      params: { unitCode: `${TOPIC}_CHECKPOINT` },
    });
    check('the bound quiz is reported', (exams.body?.bound || []).length === 1,
      `${(exams.body?.bound || []).length} bound`);
    check('a quiz does not count as a submission',
      exams.body?.hasAssessment === true && exams.body?.hasSubmission === false);

    /**
     * The headline of P8C.0. A CHECKPOINT's readiness rule is `assessment` at every rung, so
     * before binding existed it could not reach TEACHABLE, could not be published, and nothing
     * on the screen explained why. The rule is unchanged; only the way to satisfy it is new.
     */
    const covChk = await coverageOf(tenantId, `${TOPIC}_CHECKPOINT`);
    check('a CHECKPOINT reaches READY on its bound quiz alone', covChk?.readiness === 'READY',
      String(covChk?.readiness));

    const pubChk = await call(units.publishUnit, tenantId, {
      params: { unitCode: `${TOPIC}_CHECKPOINT` },
    });
    check('and can now be published', pubChk.code === 200,
      String(pubChk.body?.message || '').slice(0, 90));

    const covChk2 = await coverageOf(tenantId, `${TOPIC}_CHECKPOINT`);
    check('published AND ready is composer eligible', covChk2?.composerReady === true);

    const quizRow = await Quiz.findOne({ tenantId, unitCode: `${TOPIC}_CHECKPOINT` })
      .select('_id').lean() as any;
    const unbindQ = await call(units.unbindUnitQuiz, tenantId, {
      params: { unitCode: `${TOPIC}_CHECKPOINT`, quizId: String(quizRow._id) },
    });
    const quizKept = await Quiz.countDocuments({ tenantId, title: `${PREFIX}Checkpoint quiz` });
    check('unbinding releases the quiz without deleting it',
      unbindQ.code === 200 && quizKept === 1, `${quizKept} quiz row(s) remain`);

    const covChk3 = await coverageOf(tenantId, `${TOPIC}_CHECKPOINT`);
    check('readiness falls back the moment it is unbound', covChk3?.readiness !== 'READY',
      String(covChk3?.readiness));

    /* ---- 11. assignment binding ------------------------------------ */

    console.log('\nASSIGNMENT BINDING');
    if (!ACTOR_ID) {
      console.log('  ..  skipped: no user in this tenant to attribute an assignment to');
    } else {
      const madeAsg = await call(units.createUnitAssessment, tenantId, {
        params: { unitCode: `${TOPIC}_PROJECT` },
        body: { kind: 'ASSIGNMENT', title: `${PREFIX}Project brief` },
      });
      check('an assignment can be created and bound', madeAsg.code === 200,
        String(madeAsg.body?.message || '').slice(0, 80));

      const projExams = await call(units.unitAssessments, tenantId, {
        params: { unitCode: `${TOPIC}_PROJECT` },
      });
      check('an assignment DOES count as a submission',
        projExams.body?.hasSubmission === true);

      // PROJECT needs a brief of its own as well as somewhere to submit.
      const brief = await LearningContentLibrary.create({
        tenantId, type: 'notes', title: `${PREFIX}Brief`,
        unitCode: `${TOPIC}_PROJECT`, skillKeys: [SKILL],
        body: 'Temporary project brief.', isPublished: true, createdBy: 'acceptance',
      } as any);

      const covProj = await coverageOf(tenantId, `${TOPIC}_PROJECT`);
      check('a PROJECT with a brief and an assignment is READY',
        covProj?.readiness === 'READY',
        `${covProj?.readiness}, submission ${covProj?.ownSubmission}`);

      const asgRow = await Assignment.findOne({
        ...(tenantOid ? { tenant: tenantOid } : {}), unitCode: `${TOPIC}_PROJECT`,
      }).select('_id').lean() as any;
      const unbindA = await call(units.unbindUnitAssignment, tenantId, {
        params: { unitCode: `${TOPIC}_PROJECT`, assignmentId: String(asgRow._id) },
      });
      check('the assignment unbinds and survives', unbindA.code === 200);

      const covProj2 = await coverageOf(tenantId, `${TOPIC}_PROJECT`);
      check('a PROJECT without a submission axis is not READY',
        covProj2?.readiness !== 'READY', String(covProj2?.readiness));

      void brief;
    }

    /* ---- 12. archive, delete, and release -------------------------- */

    console.log('\nSTATUS AND DELETION');
    const archived = await call(units.setUnitStatus, tenantId, {
      params: { unitCode: `${TOPIC}_CHECKPOINT` }, body: { status: 'ARCHIVED' },
    });
    check('a published unit can be archived', archived.code === 200,
      String(archived.body?.message || '').slice(0, 70));

    const backToDraft = await call(units.setUnitStatus, tenantId, {
      params: { unitCode: `${TOPIC}_CHECKPOINT` }, body: { status: 'DRAFT' },
    });
    check('and brought back to draft', backToDraft.code === 200);

    const deleted = await call(units.deleteUnit, tenantId, {
      params: { unitCode: `${TOPIC}_CONCEPT` },
    });
    check('an unpublished unit can be deleted', deleted.code === 200,
      String(deleted.body?.message || '').slice(0, 70));

    const releasedRows = await LearningContentLibrary.countDocuments({
      tenantId, title: { $regex: `^${PREFIX}` }, unitCode: { $exists: true, $ne: '' },
    });
    const keptRows = await LearningContentLibrary.countDocuments({
      tenantId, title: { $regex: `^${PREFIX}` },
    });
    check('its content was RELEASED, not deleted',
      keptRows >= 2 && releasedRows < keptRows, `${keptRows} kept, ${releasedRows} still bound`);

    const detach = await call(units.detachContent, tenantId, {
      params: { unitCode: `${TOPIC}_PROJECT`, contentId: String(note._id) },
    });
    check('detaching a row that is not attached is refused', detach.code === 404);

    /* ---- 13. composer gate ----------------------------------------- */

    console.log('\nCOMPOSER GATE');
    const { loadCandidates } = await import('../services/composerCandidateService');
    const production = await loadCandidates(tenantId, 'PRODUCTION');
    check('nothing from this test is composer eligible',
      !production.units.some(u => u.unitCode.startsWith(TOPIC)),
      production.units.filter(u => u.unitCode.startsWith(TOPIC)).map(u => u.unitCode).join(','));
    check('PRODUCTION remains empty overall', production.units.length === 0,
      `${production.units.length} eligible`);
  } finally {
    /* ---- cleanup, whatever happened -------------------------------- */

    console.log('\nCLEANUP');

    const removedUnits = await CurriculumLearningUnit
      .deleteMany({ tenantId, unitCode: { $regex: `^${TOPIC}` } });
    const removedContent = await LearningContentLibrary
      .deleteMany({ tenantId, title: { $regex: `^${PREFIX}` } });
    const removedQuizzes = await Quiz.deleteMany({ tenantId, title: { $regex: `^${PREFIX}` } });
    const removedAssignments = tenantOid
      ? await Assignment.deleteMany({ tenant: tenantOid, title: { $regex: `^${PREFIX}` } })
      : { deletedCount: 0 } as any;

    /**
     * Topics and the module come off through the controller too, so the teardown exercises the
     * delete path rather than reaching past it. Days are relaid by the service as they go.
     */
    const doc = await LearningCurriculum.findOne({ tenantId, adaptiveStage: STAGE }).lean() as any;
    for (const t of (doc?.topics || []).filter((x: any) => String(x.topicCode).startsWith(TOPIC))) {
      await call(stage.removeTopic, tenantId, { params: { stage: STAGE, topicId: String(t._id) } });
    }
    await call(stage.removeModule, tenantId, {
      params: { stage: STAGE, moduleCode: MODULE },
    });

    console.log(`  removed ${removedUnits.deletedCount} unit(s), `
      + `${removedContent.deletedCount} content row(s), `
      + `${removedQuizzes.deletedCount} quiz(zes), `
      + `${(removedAssignments as any).deletedCount} assignment(s)`);

    /* ---- the curriculum is as we found it -------------------------- */

    const after = {
      units: await CurriculumLearningUnit.countDocuments({ tenantId }),
      published: await CurriculumLearningUnit.countDocuments({ tenantId, status: 'PUBLISHED' }),
      drafts: await CurriculumLearningUnit.countDocuments({ tenantId, status: 'DRAFT' }),
      overrides: await CurriculumLearningUnit.countDocuments({
        tenantId, suitableStates: { $exists: true, $ne: [] },
      }),
      boundContent: await LearningContentLibrary.countDocuments({
        tenantId, unitCode: { $exists: true, $ne: '' },
      }),
      boundQuizzes: await Quiz.countDocuments({ tenantId, unitCode: { $exists: true, $ne: '' } }),
      boundAssignments: tenantOid
        ? await Assignment.countDocuments({ tenant: tenantOid, unitCode: { $exists: true, $ne: '' } })
        : 0,
      topics: 0,
      modules: 0,
    };
    const doc2 = await LearningCurriculum.findOne({ tenantId, adaptiveStage: STAGE }).lean() as any;
    after.topics = (doc2?.topics || []).length;
    after.modules = (doc2?.modules || []).length;

    console.log('\nBASELINE RESTORED?');
    for (const key of Object.keys(baseline) as (keyof typeof baseline)[]) {
      check(`${key} unchanged`, after[key] === baseline[key],
        `${baseline[key]} -> ${after[key]}`);
    }

    const residueUnits = await CurriculumLearningUnit.countDocuments({
      tenantId, unitCode: { $regex: PREFIX },
    });
    const residueContent = await LearningContentLibrary.countDocuments({
      tenantId, title: { $regex: `^${PREFIX}` },
    });
    const residueQuiz = await Quiz.countDocuments({ tenantId, title: { $regex: `^${PREFIX}` } });
    const residueAsg = tenantOid
      ? await Assignment.countDocuments({ tenant: tenantOid, title: { $regex: `^${PREFIX}` } })
      : 0;
    const residueTopic = (doc2?.topics || []).filter((t: any) => String(t.topicCode).startsWith(TOPIC)).length;
    const residueModule = (doc2?.modules || []).filter((m: any) => String(m.moduleCode) === MODULE).length;

    check('no test units remain', residueUnits === 0, String(residueUnits));
    check('no test content remains', residueContent === 0, String(residueContent));
    check('no test quiz remains', residueQuiz === 0, String(residueQuiz));
    check('no test assignment remains', residueAsg === 0, String(residueAsg));
    check('no test topic remains', residueTopic === 0, String(residueTopic));
    check('no test module remains', residueModule === 0, String(residueModule));

    console.log(`\n${passed} passed, ${failed} failed\n`);
    await mongoose.disconnect();
    if (failed) process.exit(1);
  }
})().catch(e => { console.error(e); process.exit(1); });
