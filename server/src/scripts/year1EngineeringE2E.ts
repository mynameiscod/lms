/**
 * Phase 26 — the whole Year-1 engine, end to end, against controlled inventory.
 *
 *   npx ts-node src/scripts/year1EngineeringE2E.ts <tenantId>
 *
 * ── WHY SYNTHETIC UNITS, AND WHAT THAT DOES NOT MEAN ──────────────────────────────────────
 *
 * A ninety-day plan needs ninety composer-eligible units, and the real curriculum has none
 * published — content authoring is the open work, and the readiness audit says so plainly.
 * So this builds its own ZZTEST_ inventory, drives the entire student path through it, and
 * removes every trace.
 *
 * That proves the ENGINE. It is not a claim that Year 1 is ready to teach anybody: synthetic
 * units contain one line of placeholder text each, and nothing here should ever be read as
 * production readiness. The script asserts the real 337 are untouched precisely so the two
 * can never be confused.
 *
 * ── WHAT GOES THROUGH THE ADMIN PATH, AND WHAT IS SCAFFOLDING ─────────────────────────────
 *
 * Module, topic, unit save, publish, quiz binding, assignment binding, status and delete all
 * go through the same controller functions the HTTP routes invoke — that is the Admin half of
 * the E2E and it is the half that must be real. Library rows are written straight to the model
 * because they are bulk scaffolding for the student half, and the Admin content path already
 * has its own acceptance coverage in acceptanceAdminAuthoring.
 *
 * ── CLEANUP RUNS IN `finally`, AND THE BASELINE IS ASSERTED BACK ──────────────────────────
 *
 * Eleven counts are captured before the first write and checked afterwards. "The test passed"
 * and "the curriculum is as we found it" are different claims, and only the second is safe to
 * walk away from.
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import LearningCurriculum from '../models/LearningCurriculum';
import LearningContentLibrary from '../models/LearningContentLibrary';
import DayPlan from '../models/DayPlan';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import Quiz from '../models/Quiz';
import Assignment from '../models/Assignment';
import CareerSkill from '../models/CareerSkill';
import User from '../models/User';
import * as units from '../controllers/curriculumLearningUnitController';
import * as stage from '../controllers/stageCurriculumController';
import * as studentJourney from '../controllers/foundationJourneyController';
import { FOUNDATION_PROGRAM_DAYS } from '../data/ninetyDayPolicy';
import {
  persistFoundationJourney, checkJourneyIntegrity, deleteFoundationJourney,
} from '../services/foundationJourneyService';
import { recomposeFutureDays } from '../services/foundationRecompositionService';
import { loadCandidates } from '../services/composerCandidateService';
import { StudentProfile } from '../services/curriculumComposerService';

dotenv.config();

const PREFIX = 'ZZTEST_';
const MODULE = `${PREFIX}E2E_MODULE`;
const TOPIC = `T_${PREFIX}E2E`;
const STAGE = 'foundation';

let passed = 0;
let failed = 0;
const check = (label: string, ok: boolean, detail = '') => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  if (ok) passed++; else failed++;
};
const section = (s: string) => console.log(`\n${s}`);

const capture = () => {
  const out: { code: number; body: any } = { code: 200, body: null };
  const res: any = {
    status(c: number) { out.code = c; return res; },
    json(b: any) { out.body = b; return res; },
  };
  return { res, out };
};

let ACTOR = '';
const call = async (fn: (req: any, res: any) => Promise<any>, tenantId: string, extra: any = {}) => {
  const { res, out } = capture();
  await fn({
    user: { id: ACTOR, tenantId, email: 'e2e@codebegun.test' },
    params: {}, body: {}, query: {}, ...extra,
  } as any, res);
  return out;
};

/* ------------------------------------------------------------------ *
 * The controlled inventory
 * ------------------------------------------------------------------ */

interface Spec { type: string; depth: string; category: string; n: number; }

/**
 * Shaped to satisfy the production allocation for an EMERGING learner with slack.
 *
 * Not a curriculum. The counts exist so every composition role has somewhere to draw from;
 * the material behind them is one placeholder line per unit.
 */
const INVENTORY: Spec[] = [
  { type: 'CONCEPT', depth: 'FOUNDATION', category: 'UNIVERSAL', n: 40 },
  { type: 'CONCEPT', depth: 'GUIDED', category: 'UNIVERSAL', n: 26 },
  { type: 'CONCEPT', depth: 'STANDARD', category: 'UNIVERSAL', n: 18 },
  { type: 'CONCEPT', depth: 'STANDARD', category: 'DIRECTION', n: 12 },
  { type: 'CONCEPT', depth: 'STANDARD', category: 'EXPLORATION', n: 4 },
  { type: 'PRACTICE', depth: 'STANDARD', category: 'UNIVERSAL', n: 18 },
  { type: 'DEBUG', depth: 'STANDARD', category: 'UNIVERSAL', n: 14 },
  { type: 'PROJECT', depth: 'STANDARD', category: 'UNIVERSAL', n: 8 },
  { type: 'CHECKPOINT', depth: 'STANDARD', category: 'UNIVERSAL', n: 4 },
];

(async () => {
  const tenantId = process.argv[2];
  if (!tenantId) {
    console.error('Usage: year1EngineeringE2E.ts <tenantId>');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const tenantOid = mongoose.Types.ObjectId.isValid(tenantId)
    ? new mongoose.Types.ObjectId(tenantId) : null;

  const admin = await User.findOne({ tenantId: tenantOid }).select('_id').lean() as any;
  ACTOR = admin ? String(admin._id) : '';

  /** A synthetic student. Never a real one — nobody's plan is touched by this script. */
  const STUDENT = new mongoose.Types.ObjectId();

  /**
   * SEVERAL skills, not one.
   *
   * The first version of this script gave all 144 synthetic units a single skill, and the
   * recomposition step then failed for a reason that was purely an artifact: verifying that
   * one skill made every CONCEPT and PRACTICE unit in the whole inventory unsuitable at once,
   * leaving twenty-six post-mastery units to fill eighty-four days. A real curriculum spreads
   * fifty-five skills across its units, so improving at one changes part of the plan rather
   * than invalidating all of it. The fixture has to have that property or it tests a situation
   * that cannot occur.
   */
  const skillRows = await CareerSkill.find({ active: true, nodeType: 'SKILL' })
    .select('key').limit(8).lean() as any[];
  const SKILLS = skillRows.map(r => String(r.key));
  const SKILL = SKILLS[0] || '';
  if (SKILLS.length < 4) {
    console.error('The CareerSkill registry has too few active skills for this E2E.');
    process.exit(1);
  }

  /* ---- baseline, before anything is written ---------------------- */

  const countBaseline = async () => ({
    units: await CurriculumLearningUnit.countDocuments({ tenantId }),
    published: await CurriculumLearningUnit.countDocuments({ tenantId, status: 'PUBLISHED' }),
    drafts: await CurriculumLearningUnit.countDocuments({ tenantId, status: 'DRAFT' }),
    overrides: await CurriculumLearningUnit.countDocuments({
      tenantId, suitableStates: { $exists: true, $ne: [] },
    }),
    library: await LearningContentLibrary.countDocuments({ tenantId }),
    boundContent: await LearningContentLibrary.countDocuments({
      tenantId, unitCode: { $exists: true, $ne: '' },
    }),
    boundQuizzes: await Quiz.countDocuments({ tenantId, unitCode: { $exists: true, $ne: '' } }),
    boundAssignments: tenantOid
      ? await Assignment.countDocuments({ tenant: tenantOid, unitCode: { $exists: true, $ne: '' } }) : 0,
    dayPlans: await DayPlan.countDocuments({}),
    curricula: await LearningCurriculum.countDocuments({ tenantId }),
    topics: 0, modules: 0,
  });

  const baseline = await countBaseline();
  const doc0 = await LearningCurriculum.findOne({ tenantId, adaptiveStage: STAGE }).lean() as any;
  baseline.topics = (doc0?.topics || []).length;
  baseline.modules = (doc0?.modules || []).length;

  console.log(`\nYEAR-1 ENGINEERING E2E  ·  tenant ${tenantId}`);
  console.log(`  baseline: ${baseline.units} units (${baseline.published} published), `
    + `${baseline.dayPlans} DayPlans, ${baseline.topics} topics, ${baseline.modules} modules`);
  console.log('  synthetic inventory proves the ENGINE. It is not production content.\n');

  const created: string[] = [];

  try {
    /* ================= ADMIN E2E ================= */

    section('ADMIN — authoring the hierarchy');

    const mod = await call(stage.putModule, tenantId, {
      params: { stage: STAGE },
      body: { moduleCode: MODULE, moduleName: 'E2E Module', displayOrder: 9995 },
    });
    check('module authored', mod.code === 200, String(mod.body?.message || '').slice(0, 60));

    const top = await call(stage.postTopic, tenantId, {
      params: { stage: STAGE },
      body: {
        title: 'E2E Topic', moduleCode: MODULE, topicCode: TOPIC,
        skillKeys: [SKILL], defaultDepth: 'STANDARD',
      },
    });
    check('topic authored', top.code === 200, String(top.body?.message || '').slice(0, 60));

    // Author-error paths, proving the guards are live on the real controllers.
    const badSkill = await call(units.saveUnit, tenantId, {
      params: { unitCode: `${TOPIC}_BAD` },
      body: { moduleCode: MODULE, topicCode: TOPIC, title: 'Bad', skillKeys: ['NOPE_NOT_A_SKILL'] },
    });
    check('unknown skill refused', badSkill.code === 400);

    const badDir = await call(units.saveUnit, tenantId, {
      params: { unitCode: `${TOPIC}_BAD` },
      body: {
        moduleCode: MODULE, topicCode: TOPIC, title: 'Bad', skillKeys: [SKILL],
        applicableDirections: ['SOFTWARE_DEVELOPMENT'],
      },
    });
    check('unknown direction refused', badDir.code === 400);

    const ghost = await call(units.saveUnit, tenantId, {
      params: { unitCode: `${TOPIC}_BAD` },
      body: {
        moduleCode: MODULE, topicCode: TOPIC, title: 'Bad', skillKeys: [SKILL],
        prerequisiteUnitCodes: [`${TOPIC}_NOWHERE`],
      },
    });
    check('prerequisite naming nothing refused', ghost.code === 400);

    section('ADMIN — building the controlled inventory');

    let n = 0;
    for (const spec of INVENTORY) {
      for (let i = 0; i < spec.n; i++) {
        n++;
        const code = `${TOPIC}_${spec.type}_${String(n).padStart(3, '0')}`;
        const out = await call(units.saveUnit, tenantId, {
          params: { unitCode: code },
          body: {
            stageKey: STAGE, moduleCode: MODULE, topicCode: TOPIC,
            title: `E2E ${spec.type} ${n}`,
            description: 'Synthetic unit for the Phase 26 engineering E2E.',
            displayOrder: n * 10,
            skillKeys: [SKILLS[n % SKILLS.length]],
            learningOutcomes: ['Prove the engine end to end'],
            estimatedMinutes: 45,
            unitType: spec.type, category: spec.category, defaultDepth: spec.depth,
            applicableDirections: spec.category === 'DIRECTION' ? ['SOFTWARE_BACKEND'] : [],
            mandatory: spec.category === 'UNIVERSAL',
          },
        });
        if (out.code === 200) created.push(code); else failed++;
      }
    }
    check('every synthetic unit authored through saveUnit', created.length === n,
      `${created.length} of ${n}`);

    /**
     * Content and assessments, written straight to the models.
     *
     * Bulk scaffolding for the student half. The Admin content and binding paths have their
     * own acceptance coverage; repeating 300 controller calls here would add runtime and no
     * information.
     */
    const contentRows: any[] = [];
    const quizRows: any[] = [];
    const skillOf = new Map<string, string>();
    for (const [idx, code] of created.entries()) skillOf.set(code, SKILLS[(idx + 1) % SKILLS.length]);
    for (const code of created) {
      const type = code.includes('_CONCEPT_') ? 'CONCEPT'
        : code.includes('_PRACTICE_') ? 'PRACTICE'
          : code.includes('_DEBUG_') ? 'DEBUG'
            : code.includes('_PROJECT_') ? 'PROJECT' : 'CHECKPOINT';

      const base = {
        tenantId, unitCode: code, topicCode: TOPIC, skillKeys: [skillOf.get(code) || SKILL],
        isPublished: true, createdBy: 'e2e', estimatedDuration: 15,
      };
      if (type === 'CONCEPT' || type === 'PROJECT') {
        contentRows.push({ ...base, type: 'notes', title: `${PREFIX}${code} notes`, notesContent: 'Synthetic.' });
      }
      if (type === 'CONCEPT' || type === 'PRACTICE' || type === 'DEBUG') {
        contentRows.push({ ...base, type: 'practice_coding', title: `${PREFIX}${code} practice` });
      }
      if (type === 'CONCEPT' || type === 'CHECKPOINT') {
        quizRows.push({
          tenantId, unitCode: code, title: `${PREFIX}${code} quiz`, createdBy: 'e2e',
          startDate: new Date(), endDate: new Date(Date.now() + 31536000000),
          startTime: '00:00', endTime: '23:59', totalMarks: 10, totalTime: 10, isActive: true,
        });
      }
    }
    await LearningContentLibrary.insertMany(contentRows, { ordered: false });
    await Quiz.insertMany(quizRows, { ordered: false });

    // PROJECT units need something to submit to, and only an Assignment can be that.
    if (tenantOid && ACTOR) {
      await Assignment.insertMany(
        created.filter(c => c.includes('_PROJECT_')).map(code => ({
          tenant: tenantOid, unitCode: code, title: `${PREFIX}${code} brief`,
          type: 'project', status: 'draft', totalPoints: 100,
          createdBy: new mongoose.Types.ObjectId(ACTOR),
        })), { ordered: false },
      );
    }
    check('content and assessments attached', contentRows.length > 0 && quizRows.length > 0,
      `${contentRows.length} rows, ${quizRows.length} quizzes`);

    section('ADMIN — readiness, publishing, composer eligibility');

    const listed = await call(units.listUnits, tenantId, { query: { stage: STAGE } });
    const mine = (listed.body?.rows || [])
      .flatMap((t: any) => t.units || [])
      .filter((u: any) => String(u.unitCode).startsWith(TOPIC));
    const ready = mine.filter((u: any) => u.coverage?.readiness === 'READY');
    check('synthetic units reach READY', ready.length >= FOUNDATION_PROGRAM_DAYS,
      `${ready.length} READY of ${mine.length}`);

    // Nothing is composer-eligible before publication, however READY it is.
    const beforePublish = await loadCandidates(tenantId, 'PRODUCTION');
    check('READY alone is not composer eligible', beforePublish.units.length === 0,
      `${beforePublish.units.length} eligible`);

    let publishedCount = 0;
    for (const u of ready) {
      const p = await call(units.publishUnit, tenantId, { params: { unitCode: u.unitCode } });
      if (p.code === 200) publishedCount++;
    }
    check('READY units publish through the admin route', publishedCount === ready.length,
      `${publishedCount} published`);

    const eligible = await loadCandidates(tenantId, 'PRODUCTION');
    check('PUBLISHED and READY is composer eligible', eligible.units.length === publishedCount,
      `${eligible.units.length} eligible`);
    check('every eligible unit is one of ours — no real unit became eligible',
      eligible.units.every(u => u.unitCode.startsWith(TOPIC)));

    /* ================= STUDENT E2E ================= */

    section('STUDENT — composing and persisting ninety days');

    const profile: StudentProfile = {
      skills: new Map(), primaryDirection: null, directionStatus: 'UNDECIDED',
    };

    const first = await persistFoundationJourney(tenantId, STUDENT, profile);
    check('journey persisted', first.ok === true, first.reason || '');
    check('exactly ninety days', first.days === FOUNDATION_PROGRAM_DAYS, String(first.days));
    check('reported as newly created', first.created === true);

    const integrity = await checkJourneyIntegrity(tenantId, STUDENT);
    check('no gaps, no duplicates, every day has a unit', integrity.ok === true,
      `missing ${integrity.missing.length}, dup ${integrity.duplicates.length}, `
      + `unitless ${integrity.daysWithoutUnit.length}`);

    const second = await persistFoundationJourney(tenantId, STUDENT, profile);
    check('creating twice is idempotent', second.ok && second.created === false
      && String(second.curriculumId) === String(first.curriculumId));

    const afterTwice = await checkJourneyIntegrity(tenantId, STUDENT);
    check('still ninety days after a duplicate request', afterTwice.days === FOUNDATION_PROGRAM_DAYS,
      String(afterTwice.days));

    // Half the journey is destroyed and rebuilt, standing in for a crash mid-write.
    await DayPlan.deleteMany({ curriculumId: first.curriculumId, dayNumber: { $gt: 45 } });
    const repaired = await persistFoundationJourney(tenantId, STUDENT, profile);
    const afterRepair = await checkJourneyIntegrity(tenantId, STUDENT);
    check('a half-written journey completes on retry',
      repaired.ok && afterRepair.days === FOUNDATION_PROGRAM_DAYS, String(afterRepair.days));

    section('STUDENT — the journey surface');

    await CurriculumEnrollment.create({
      tenantId, curriculumId: first.curriculumId, curriculumTitle: 'E2E',
      studentId: STUDENT, studentName: 'E2E Student', studentEmail: 'e2e@test',
      startDate: new Date(), status: 'active', currentDay: 6,
      completedDays: [1, 2, 3, 4, 5], completedItems: [], enrolledBy: 'e2e',
    } as any);

    const overview = await call(
      studentJourney.getMyJourney, tenantId, { user: { id: String(STUDENT), tenantId } },
    );
    check('student sees ninety days', overview.body?.totalDays === FOUNDATION_PROGRAM_DAYS
      && (overview.body?.days || []).length === FOUNDATION_PROGRAM_DAYS);
    check('student sees their progress', overview.body?.completedCount === 5
      && overview.body?.currentDay === 6);

    const wire = JSON.stringify(overview.body);
    check('no composer or authoring internals reach the student',
      !wire.includes('readiness') && !wire.includes('PUBLISHED')
      && !wire.includes('unitCode') && !wire.includes('scheduledAt'));

    const day1 = await call(studentJourney.getMyJourneyDay, tenantId, {
      user: { id: String(STUDENT), tenantId }, params: { dayNumber: '1' },
    });
    check('day one loads with activities', day1.code === 200
      && (day1.body?.activities || []).length > 0,
      `${(day1.body?.activities || []).length} activities`);
    check('day one names its objective', !!day1.body?.title);

    const day90 = await call(studentJourney.getMyJourneyDay, tenantId, {
      user: { id: String(STUDENT), tenantId }, params: { dayNumber: '90' },
    });
    check('day ninety exists', day90.code === 200);

    const day91 = await call(studentJourney.getMyJourneyDay, tenantId, {
      user: { id: String(STUDENT), tenantId }, params: { dayNumber: '91' },
    });
    check('day ninety-one does not', day91.code === 400);

    section('STUDENT — reassessment and future-only recomposition');

    const before = await DayPlan.find({ curriculumId: first.curriculumId })
      .select('dayNumber primaryUnitCode').sort({ dayNumber: 1 }).lean() as any[];
    const beforeByDay = new Map(before.map(d => [d.dayNumber, d.primaryUnitCode]));

    /**
     * New evidence: the student has demonstrated SOME of what the inventory teaches.
     *
     * A subset, because that is what a reassessment produces. Verifying everything at once is
     * the all-verified stress case, which is a diagnostic rather than a journey.
     */
    const improved: StudentProfile = {
      skills: new Map(
        SKILLS.slice(0, 2).map(k => [k, { score: 90, confidence: 'HIGH' as any }]),
      ),
      primaryDirection: null, directionStatus: 'UNDECIDED',
    };

    const recomposed = await recomposeFutureDays(tenantId, STUDENT, improved);
    check('recomposition ran', recomposed.ok === true, recomposed.reason || '');
    check('completed days were frozen', recomposed.frozenDays.join(',') === '1,2,3,4,5,6');

    const after = await DayPlan.find({ curriculumId: first.curriculumId })
      .select('dayNumber primaryUnitCode').sort({ dayNumber: 1 }).lean() as any[];
    const afterByDay = new Map(after.map(d => [d.dayNumber, d.primaryUnitCode]));

    const pastChanged = [1, 2, 3, 4, 5, 6].filter(d => beforeByDay.get(d) !== afterByDay.get(d));
    check('no completed or in-progress day was rewritten', pastChanged.length === 0,
      pastChanged.join(','));

    const futureChanged = Array.from({ length: 84 }, (_, i) => i + 7)
      .filter(d => beforeByDay.get(d) !== afterByDay.get(d));
    check('future days responded to the new evidence', futureChanged.length > 0,
      `${futureChanged.length} days changed`);

    check('still exactly ninety days after recomposition',
      after.length === FOUNDATION_PROGRAM_DAYS, String(after.length));

    const repeated = new Set(after.map(d => d.primaryUnitCode));
    check('no unit is scheduled twice', repeated.size === after.length,
      `${repeated.size} distinct of ${after.length}`);

    section('SAFETY');

    const noJourney = await recomposeFutureDays(tenantId, new mongoose.Types.ObjectId(), profile);
    check('recomposing a student with no journey is refused', noJourney.ok === false);

    const archived = await call(units.setUnitStatus, tenantId, {
      params: { unitCode: created[0] }, body: { status: 'ARCHIVED' },
    });
    const afterArchive = await loadCandidates(tenantId, 'PRODUCTION');
    check('an archived unit leaves the composer pool', archived.code === 200
      && !afterArchive.units.some(u => u.unitCode === created[0]));

    const delPublished = await call(units.deleteUnit, tenantId, {
      params: { unitCode: created[1] },
    });
    check('a published unit cannot be deleted', delPublished.code === 409);
  } finally {
    section('CLEANUP');

    await deleteFoundationJourney(tenantId, STUDENT);
    await CurriculumEnrollment.deleteMany({ studentId: STUDENT });
    const u = await CurriculumLearningUnit.deleteMany({ tenantId, unitCode: { $regex: `^${TOPIC}` } });
    const c = await LearningContentLibrary.deleteMany({ tenantId, title: { $regex: `^${PREFIX}` } });
    const q = await Quiz.deleteMany({ tenantId, title: { $regex: `^${PREFIX}` } });
    const a = tenantOid
      ? await Assignment.deleteMany({ tenant: tenantOid, title: { $regex: `^${PREFIX}` } })
      : { deletedCount: 0 } as any;

    const doc = await LearningCurriculum.findOne({ tenantId, adaptiveStage: STAGE }).lean() as any;
    for (const t of (doc?.topics || []).filter((x: any) => String(x.topicCode).startsWith(TOPIC))) {
      await call(stage.removeTopic, tenantId, { params: { stage: STAGE, topicId: String(t._id) } });
    }
    await call(stage.removeModule, tenantId, { params: { stage: STAGE, moduleCode: MODULE } });

    console.log(`  removed ${u.deletedCount} units, ${c.deletedCount} content rows, `
      + `${q.deletedCount} quizzes, ${(a as any).deletedCount} assignments`);

    const after = await countBaseline();
    const doc2 = await LearningCurriculum.findOne({ tenantId, adaptiveStage: STAGE }).lean() as any;
    after.topics = (doc2?.topics || []).length;
    after.modules = (doc2?.modules || []).length;

    section('THE REAL CURRICULUM IS AS WE FOUND IT');
    for (const key of Object.keys(baseline) as (keyof typeof baseline)[]) {
      check(`${key} unchanged`, after[key] === baseline[key], `${baseline[key]} -> ${after[key]}`);
    }

    const residue = await CurriculumLearningUnit.countDocuments({ tenantId, unitCode: /ZZTEST/ })
      + await LearningContentLibrary.countDocuments({ tenantId, title: /^ZZTEST/ })
      + await Quiz.countDocuments({ tenantId, title: /^ZZTEST/ });
    check('no ZZTEST residue anywhere', residue === 0, String(residue));

    console.log(`\n${passed} passed, ${failed} failed\n`);
    await mongoose.disconnect();
    if (failed) process.exit(1);
  }
})().catch(e => { console.error(e); process.exit(1); });
