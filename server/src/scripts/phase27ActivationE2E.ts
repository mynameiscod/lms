/**
 * Phase 27 — activate the UNIT curriculum engine, then accept it end to end on the real paths.
 *
 *   PUBLISH_ADMIN_EMAIL=... PUBLISH_ADMIN_PASSWORD=... \
 *     npx ts-node src/scripts/phase27ActivationE2E.ts <tenantId>              # preconditions, delivery, config checks
 *     npx ts-node src/scripts/phase27ActivationE2E.ts <tenantId> --activate   # ... then activate and run the full E2E
 *     npx ts-node src/scripts/phase27ActivationE2E.ts <tenantId> --cleanup-only
 *
 * ── WHAT IS REAL, AND WHAT IS A FIXTURE ───────────────────────────────────────────────────
 *
 * Every consequence is produced by the application: requests go through routes/index with a
 * signed-in token, adaptive handlers are registered exactly as server start-up registers them,
 * and journeys, recompositions and evidence are written only by the services those routes call.
 * The certified 338 units, their content and quizzes are read and never edited.
 *
 * Fixtures exist only where this reconstructed database has nothing to act on, and are named so
 * they cannot be confused with anything real: students on `@p27-e2e.careerpilot.invalid`,
 * diagnostic AssessmentItems tagged `p27-e2e`, and IN_PROGRESS diagnostic papers for those
 * students (the database has no diagnostic bank, so a paper cannot be generated). A student
 * then SUBMITS the paper through the real endpoint — grading, Skill DNA projection, the
 * DIAGNOSTIC_COMPLETED event and engine routing are all production code.
 *
 * ── ACTIVATION ────────────────────────────────────────────────────────────────────────────
 *
 * Only with --activate, and only through PUT /api/v1/careerpilot/config as a MANAGE admin.
 * The activation configuration is the purpose of Phase 27 and is kept; everything else this
 * script creates is removed, and the collection counts are checked back against the baseline.
 */

import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import apiRoutes from '../routes';
import User from '../models/User';
import AssessmentItem from '../models/AssessmentItem';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import LearningCurriculum from '../models/LearningCurriculum';
import DayPlan from '../models/DayPlan';
import CurriculumEnrollment from '../models/CurriculumEnrollment';
import Quiz from '../models/Quiz';
import Question from '../models/Question';
import CareerSkill from '../models/CareerSkill';
import SkillEvidence from '../models/SkillEvidence';
import StudentSkillEvidence from '../models/StudentSkillEvidence';
import { registerAdaptiveHandlers, publish } from '../services/adaptiveCurriculumEvents';
import { loadCandidates } from '../services/composerCandidateService';
import { ComposableUnit } from '../services/curriculumComposerService';
import { loadAssets, activitiesFor, UnitAssets, FOUNDATION_JOURNEY_KIND, deleteFoundationJourney } from '../services/foundationJourneyService';
import { backfillFoundationJourneys } from '../services/foundationJourneyBackfillService';
import { resolveCurriculumEngine } from '../services/curriculumEngineService';
import { foundationReadiness } from '../services/foundationReadinessService';
import { effectiveCurriculumEngine } from '../data/curriculumEnginePolicy';
import { clampPreviewDays } from '../data/foundationAccessPolicy';
import { checkCurriculumQuizLinkage } from '../services/quizLinkageService';
import { diagnosticSkills, masteredBy } from '../services/composerCertificationService';
import { getSkillDna } from '../services/skillDnaService';
import { typeRequiresTeaching } from '../data/unitReadinessPolicy';
import { roleOf, teaches } from '../data/contentBundlePolicy';
import { stateForScore } from '../data/adaptiveCurriculumPolicy';
import { FOUNDATION_PROGRAM_DAYS } from '../data/ninetyDayPolicy';

/**
 * Runs against any tenant's database, including a live one.
 *
 * Nothing machine-specific is assumed: the unit fingerprint (which carries timestamps) is compared
 * with this run's own starting value, and residue and drift are judged over this run's fixtures and
 * this tenant's curriculum — never over collections real members are writing to while it runs.
 */
/** Fields a document names a person by. Used both to clean fixtures up and to prove they are gone. */
const REF_FIELDS = ['studentId', 'userId', 'student', 'user', 'memberId', 'recipientId', 'recipient', 'owner', 'personalizedFor'];
/** This tenant's curriculum and assessment content, which the run must leave exactly as found. */
const CONTENT = ['curriculumlearningunits', 'learningcontentlibraries', 'quizzes', 'questions', 'assignments', 'skillevidences', 'assessmentitems', 'careerroles'];
const E2E_DOMAIN = 'p27-e2e.careerpilot.invalid';
const ITEM_TAG = 'p27-e2e';
const STUDENT_PASSWORD = 'P27-e2e-Fixture!';
const ITEMS_PER_SKILL = 5;
const FIXTURES = path.join(__dirname, '..', 'tests', 'fixtures', 'phase21');

/* ── output ─────────────────────────────────────────────────────────────────────────────── */

const logLines: string[] = [];
const rawLog = console.log.bind(console);
const rawError = console.error.bind(console);
const noisy = (s: string) => /^\[AUTH\]|MONGOOSE|trace-warnings|CODE RUNNER/.test(s);
console.log = (...a: any[]) => { const s = a.map(x => (typeof x === 'string' ? x : JSON.stringify(x))).join(' '); logLines.push(s); if (!noisy(s)) rawLog(...a); };
console.error = (...a: any[]) => { const s = a.map(x => (typeof x === 'string' ? x : String(x?.message || x))).join(' '); logLines.push(s); rawError(...a); };

let passed = 0;
const failures: string[] = [];
const results: Record<string, boolean> = {};
const check = (area: string, label: string, ok: boolean, detail = '') => {
  rawLog(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${detail ? `  — ${detail}` : ''}`);
  if (ok) passed++; else failures.push(`${area}: ${label}${detail ? ` — ${detail}` : ''}`);
  results[area] = (results[area] ?? true) && ok;
};
const section = (s: string) => rawLog(`\n${'─'.repeat(96)}\n${s}\n${'─'.repeat(96)}`);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const stableId = (seed: string) => new mongoose.Types.ObjectId(crypto.createHash('sha1').update(seed).digest('hex').slice(0, 24));

async function waitFor(pred: () => boolean | Promise<boolean>, timeoutMs = 180_000): Promise<boolean> {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await pred()) return true;
    await sleep(250);
  }
  return false;
}
const logMark = () => logLines.length;
const logSince = (mark: number, re: RegExp) => logLines.slice(mark).find(l => re.test(l)) || null;

/* ── the run ────────────────────────────────────────────────────────────────────────────── */

(async () => {
  const tenantId = process.argv[2];
  const activate = process.argv.includes('--activate');
  const cleanupOnly = process.argv.includes('--cleanup-only');
  if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId)) {
    rawError('Usage: phase27ActivationE2E.ts <tenantId> [--activate | --cleanup-only]');
    process.exit(2);
  }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  const db = mongoose.connection.db!;
  const tenantOid = new mongoose.Types.ObjectId(tenantId);
  const TID = { $in: [tenantId, tenantOid] };
  const startedAt = new Date();

  const contentCounts = async () => {
    const out: Record<string, number> = {};
    for (const c of CONTENT) out[c] = await db.collection(c).countDocuments({ $or: [{ tenantId: TID }, { tenant: tenantOid }] });
    return out;
  };
  /** Anything of this run's fixtures still in the database — what cleanup removes, counted instead. */
  const syntheticResidue = async (ids: string[], journeyIds: any[]) => {
    const oids = ids.map(id => new mongoose.Types.ObjectId(id));
    const any = [...oids, ...ids];
    const left: string[] = [];
    const note = (label: string, n: number) => { if (n) left.push(`${label} ${n}`); };
    for (const { name } of await db.listCollections().toArray()) {
      if (name === 'users') continue;
      if (ids.length) note(name, await db.collection(name).countDocuments({ $or: REF_FIELDS.map(f => ({ [f]: { $in: any } })) }));
    }
    note('users', await db.collection('users').countDocuments({ $or: [{ _id: { $in: oids } }, { email: { $regex: `@${E2E_DOMAIN.replace(/\./g, '\\.')}$` } }] }));
    if (journeyIds.length) note('dayplans of fixture journeys', await db.collection('dayplans').countDocuments({ curriculumId: { $in: journeyIds } }));
    note('fixture diagnostic items', await db.collection('assessmentitems').countDocuments({ tenantId, tags: ITEM_TAG }));
    note('fixture papers', await db.collection('personalizedassessments').countDocuments({ tenantId, policyKey: 'P27_E2E_FIXTURE' }));
    note('fixture activity rows', await db.collection('careerpilotactivities').countDocuments({ visitorId: { $in: ids.map(i => `u:${i}`) } }));
    return left;
  };
  const unitFingerprint = async () => {
    const units = await db.collection('curriculumlearningunits').find({ tenantId: TID })
      .project({ unitCode: 1, status: 1, suitableStates: 1, updatedAt: 1 }).sort({ unitCode: 1 }).toArray();
    return {
      hash: crypto.createHash('md5').update(JSON.stringify(units.map(u => [u.unitCode, u.status, u.suitableStates || null, String(u.updatedAt || '')]))).digest('hex'),
      total: units.length,
      published: units.filter(u => u.status === 'PUBLISHED').length,
    };
  };

  /* ── cleanup: idempotent, run before and after ────────────────────────────────────────── */

  const cleanup = async (label: string) => {
    const users = await db.collection('users').find({ email: { $regex: `@${E2E_DOMAIN.replace(/\./g, '\\.')}$` } }).project({ _id: 1, email: 1 }).toArray();
    const ids = users.map(u => u._id as mongoose.Types.ObjectId);
    const idStrings = ids.map(String);
    const any = [...ids, ...idStrings];
    const removed: Record<string, number> = {};
    const del = async (collection: string, filter: any) => {
      const r = await db.collection(collection).deleteMany(filter);
      if (r.deletedCount) removed[collection] = (removed[collection] || 0) + r.deletedCount;
    };

    const journeys = await db.collection('learningcurriculums').find({ personalizedFor: { $in: ids } }).project({ _id: 1 }).toArray();
    const journeyIds = journeys.map(j => j._id);
    // Assignment stats are recomputed below from what remains, so capture which ones were touched.
    const touchedAssignments = ids.length
      ? (await db.collection('submissions').find({ student: { $in: ids } }).project({ assignment: 1 }).toArray()).map(s => String(s.assignment))
      : [];

    if (journeyIds.length) {
      await del('dayplans', { curriculumId: { $in: journeyIds } });
      await del('learningcurriculums', { _id: { $in: journeyIds } });
    }
    if (ids.length) {
      const known = await db.listCollections().toArray();
      const fields = ['studentId', 'userId', 'student', 'user', 'memberId', 'recipientId', 'recipient', 'owner', 'personalizedFor'];
      for (const { name } of known) {
        if (name === 'users') continue;
        await del(name, { $or: fields.map(f => ({ [f]: { $in: any } })) });
      }
      await del('careerpilotactivities', { visitorId: { $in: idStrings.map(i => `u:${i}`) } });
      await del('users', { _id: { $in: ids } });
    }
    await del('assessmentitems', { tenantId, tags: ITEM_TAG });
    await del('personalizedassessments', { tenantId, policyKey: 'P27_E2E_FIXTURE' });
    // Default career roles are seeded lazily by the setup screen. Removed only if THIS run created them.
    if (label === 'after' && roleBaseline === 0) await del('careerroles', { tenantId, createdAt: { $gte: startedAt } });

    for (const a of [...new Set(touchedAssignments)]) {
      const svc = require('../services/assignmentService');
      const service = svc.default || svc.assignmentService || svc;
      if (typeof service.updateStats === 'function') await service.updateStats(new mongoose.Types.ObjectId(a), tenantOid).catch(() => undefined);
    }
    rawLog(`  cleanup (${label}): ${Object.keys(removed).length ? JSON.stringify(removed) : 'nothing to remove'}`);
    return removed;
  };

  let roleBaseline = await db.collection('careerroles').countDocuments({ tenantId });
  await cleanup('before');
  if (cleanupOnly) {
    await mongoose.disconnect();
    return;
  }

  const api = express();
  api.set('trust proxy', 1);
  api.use(express.json({ limit: '5mb' }));
  api.use(express.urlencoded({ extended: true }));
  api.use('/api/v1', apiRoutes);
  // Exactly what server start-up does; without it no event reaches a planner.
  registerAdaptiveHandlers();

  const as = (token: string, r: request.Test) => r.set('Authorization', `Bearer ${token}`).set('x-tenant-id', tenantId);
  const login = async (email: string, password: string) => {
    const res = await request(api).post('/api/v1/auth/login').send({ email, password });
    return String(res.body?.token || res.body?.data?.token || '');
  };

  /* ══ 1. PRECONDITIONS ════════════════════════════════════════════════════════════════════ */

  section('1. PRECONDITIONS — the certified production state');
  roleBaseline = await db.collection('careerroles').countDocuments({ tenantId });
  const contentBaseline = await contentCounts();
  const certified: string[] = [...JSON.parse(fs.readFileSync(path.join(FIXTURES, 'publish-sets.json'), 'utf8')).recommended].sort();
  const certifiedSet = new Set(certified);
  const fpBefore = await unitFingerprint();
  const production = await loadCandidates(tenantId, 'PRODUCTION');
  const prodCodes = production.units.map(u => u.unitCode).sort();
  const ready = await loadCandidates(tenantId, 'PROTOTYPE_UNPUBLISHED');
  const linkage = await checkCurriculumQuizLinkage(tenantId);
  rawLog(`  unit fingerprint at the start of this run: ${fpBefore.hash} — every later check compares against it`);
  check('pre', 'units 355, READY 341, PUBLISHED 338', fpBefore.total === 355 && ready.units.length === 341 && fpBefore.published === 338,
    `${fpBefore.total} / ${ready.units.length} / ${fpBefore.published}`);
  check('pre', 'PRODUCTION inventory is exactly the certified 338', JSON.stringify(prodCodes) === JSON.stringify(certified), `${prodCodes.length}`);
  const membersJourneys = await db.collection('learningcurriculums').countDocuments({ tenantId: TID, journeyKind: { $exists: true, $ne: null } });
  check('pre', 'no fixture left over from an earlier run', !(await syntheticResidue([], [])).length,
    `this tenant's members already hold ${membersJourneys} Foundation journey(s); they are never touched`);
  check('linkage', 'every curriculum quiz is linked both ways', linkage.ok,
    `${linkage.quizzes} quizzes, ${linkage.questions} questions; missing ${linkage.missingQuizId.length}, wrong ${linkage.wrongQuizId.length}, orphaned ${linkage.orphanedQuestions.length}, unresolved ${linkage.unresolvedQuestionIds.length}`);

  const adminEmail = process.env.PUBLISH_ADMIN_EMAIL || '';
  const adminToken = await login(adminEmail, process.env.PUBLISH_ADMIN_PASSWORD || '');
  check('pre', 'admin signs in', !!adminToken, adminEmail);
  if (!adminToken) throw new Error('admin sign-in failed');

  /* ── fixtures: students ─────────────────────────────────────────────────────────────── */

  type Case = { key: string; stage: string; role: string; correct: number; engine: 'UNIT' | 'TOPIC' };
  const CASES: Case[] = [
    { key: 'beginner', stage: 'foundation', role: 'NOT_SURE', correct: 1, engine: 'UNIT' },
    { key: 'strong', stage: 'foundation', role: 'NOT_SURE', correct: 5, engine: 'UNIT' },
    { key: 'direction', stage: 'foundation', role: 'BACKEND_ENGINEER', correct: 3, engine: 'UNIT' },
    { key: 'undecided', stage: 'foundation', role: 'NOT_SURE', correct: 3, engine: 'UNIT' },
    { key: 'boundary', stage: 'foundation', role: 'FRONTEND_ENGINEER', correct: 4, engine: 'UNIT' },
    { key: 'topic-control', stage: 'build', role: 'NOT_SURE', correct: 3, engine: 'TOPIC' },
  ];
  const students: Record<string, { id: string; token: string; email: string }> = {};
  const createStudent = async (key: string, stage: string, role: string) => {
    const email = `p27-${key}@${E2E_DOMAIN}`;
    const doc = await User.create({
      _id: stableId(`p27-e2e:student:${key}`), tenantId: tenantOid, email,
      firstName: 'P27', lastName: `E2E ${key}`, password: STUDENT_PASSWORD, role: 'STUDENT', isActive: true,
      passport: {
        active: true, product: 'career_passport', stage, primaryRole: role, careerDomain: 'SOFTWARE_ENGINEERING',
        onboarded: true, contextCompletedAt: new Date(),
      },
    } as any);
    const token = await login(email, STUDENT_PASSWORD);
    students[key] = { id: String(doc._id), token, email };
    /**
     * Onboarding through the real setup route, not a stage written by hand.
     *
     * Every career-context save re-derives `passport.stage` from education, so a fixture that
     * only set a stage lost it on its first save and dropped out of the unit engine — which a
     * real member, who always has education, never does. The setup screen's GET also seeds the
     * tenant's default career roles, exactly as a first visit would.
     */
    await as(token, request(api).get('/api/v1/careerpilot/me/context'));
    const onboarded = await as(token, request(api).put('/api/v1/careerpilot/me/context')).send({
      degree: 'B.Tech', program: 'B.Tech', branch: 'CSE', currentAcademicYear: stage === 'foundation' ? '1' : '2',
    });
    const stored = (await User.findById(doc._id).select('passport.stage').lean() as any)?.passport?.stage;
    check('fixtures', `${key}: onboarding through the real setup route resolves the ${stage} stage`,
      onboarded.status === 200 && stored === stage, `HTTP ${onboarded.status}, stage ${stored}`);
    return students[key];
  };

  /* ══ 2. CHECKPOINT DELIVERY THROUGH THE STUDENT ENDPOINT — BEFORE ACTIVATION ════════════ */

  section('2. CHECKPOINT DELIVERY — GET /quizzes/:quizId/questions as a student, UNIT still as found');
  const probe = await createStudent('delivery', 'foundation', 'NOT_SURE');
  const deliveryCase = async (unitCode: string) => {
    const quiz = await Quiz.findOne({ tenantId, unitCode }).select('_id questionIds title').lean() as any;
    const res = await as(probe.token, request(api).get(`/api/v1/quizzes/${quiz._id}/questions`));
    const got = (res.body || []).map((q: any) => String(q._id));
    const want = (quiz.questionIds || []).map(String);
    check('delivery', `${unitCode}: the student endpoint returns exactly the quiz's questions, in order`,
      res.status === 200 && got.length > 0 && JSON.stringify(got) === JSON.stringify(want), `${got.length}/${want.length}`);
    check('delivery', `${unitCode}: no answer key reaches the student`,
      (res.body || []).every((q: any) => (q.options || []).every((o: any) => o.isCorrect !== true)));
  };
  await deliveryCase('T_MILESTONE_EARLY_CHECKPOINT');
  await deliveryCase('T_MILESTONE_FOUNDATION_MIDPOINT');
  await deliveryCase('T_LOOPS_FOR_LOOPS');
  await deliveryCase('T_SQL_JOINS');

  /* ══ 3. ADMIN CONFIGURATION ═══════════════════════════════════════════════════════════════ */

  section('3. ADMIN CONFIGURATION — the supported path, and its refusals');
  const configsBefore = await db.collection('passportconfigs').countDocuments({});
  const denied = await as(probe.token, request(api).put('/api/v1/careerpilot/config')).send({ megaCurriculumStages: ['foundation'] });
  check('config', 'a student cannot change the engine', denied.status === 403, `HTTP ${denied.status}`);
  for (const [label, body] of [
    ['a non-boolean switch', { megaCurriculumEnabled: 'yes' }],
    ['a stage with no Learning Unit curriculum', { megaCurriculumStages: ['build'] }],
    ['a malformed pilot id', { megaCurriculumStudentIds: ['not-an-id'] }],
  ] as [string, any][]) {
    const r = await as(adminToken, request(api).put('/api/v1/careerpilot/config')).send(body);
    check('config', `${label} is refused`, r.status === 400 && (r.body?.errors || []).length > 0, `HTTP ${r.status}`);
  }
  check('config', 'refusals wrote nothing', (await db.collection('passportconfigs').countDocuments({})) === configsBefore);
  const OTHER = '507f1f77bcf86cd799439f99';
  const foreign = await as(adminToken, request(api).put('/api/v1/careerpilot/config'))
    .set('x-tenant-id', OTHER).send({ megaCurriculumEnabled: false, tenantId: OTHER });
  check('config', 'a request naming another tenant acts only on the signed-in tenant',
    foreign.status === 200 && !(await db.collection('passportconfigs').countDocuments({ tenantId: OTHER })), `HTTP ${foreign.status}`);
  const before = await as(adminToken, request(api).get('/api/v1/careerpilot/config'));
  // Product policy: no configuration is needed for Foundation to be planned by units.
  check('config', 'Foundation is on UNIT before any engine setting is saved', before.body?.engine?.foundationMode === 'UNIT',
    `Foundation ${before.body?.engine?.foundationMode}`);
  check('config', 'the tenant can serve the Foundation journey (provisioned)', before.body?.foundation?.configured === true,
    JSON.stringify(before.body?.foundation || null));

  if (!activate) {
    section('STOPPING BEFORE ACTIVATION (run with --activate to continue)');
    await cleanup('after');
    rawLog(`\n${failures.length ? 'FAILED' : 'PASSED'} ${passed} checks${failures.length ? `, ${failures.length} failed` : ''}`);
    await mongoose.disconnect();
    process.exit(failures.length ? 1 : 0);
  }

  /* ══ 4. ACTIVATION ════════════════════════════════════════════════════════════════════════ */

  section('4. ACTIVATION — PUT /api/v1/careerpilot/config { megaCurriculumStages: ["foundation"] }');
  const activated = await as(adminToken, request(api).put('/api/v1/careerpilot/config')).send({ megaCurriculumStages: ['foundation'] });
  check('activation', 'the Admin save succeeds', activated.status === 200, `HTTP ${activated.status}`);
  const readBack = await as(adminToken, request(api).get('/api/v1/careerpilot/config'));
  const stages = (readBack.body?.engine?.stages || []) as { stage: string; mode: string }[];
  check('activation', 'Foundation → UNIT', readBack.body?.engine?.foundationMode === 'UNIT');
  check('activation', 'every other stage → TOPIC', stages.length > 1 && stages.filter(s => s.stage !== 'foundation').every(s => s.mode === 'TOPIC'),
    stages.map(s => `${s.stage}=${s.mode}`).join(' '));
  check('activation', 'the resolver observes the saved configuration',
    (await resolveCurriculumEngine({ tenantId, studentId: probe.id })).engine === 'UNIT');
  const fpActivated = await unitFingerprint();
  const prodAfter = (await loadCandidates(tenantId, 'PRODUCTION')).units.map(u => u.unitCode).sort();
  check('activation', 'unit fingerprint unchanged by activation', fpActivated.hash === fpBefore.hash);
  check('activation', 'PRODUCTION inventory is still exactly the certified 338', JSON.stringify(prodAfter) === JSON.stringify(certified));

  /* ── fixtures: diagnostic items ─────────────────────────────────────────────────────── */

  const assessable = (await CareerSkill.find({ key: { $in: diagnosticSkills() } }).select('key assessable nodeType active').lean() as any[])
    .filter(s => s.assessable && s.nodeType !== 'GROUP' && s.active !== false).map(s => String(s.key)).sort();
  const items: { _id: mongoose.Types.ObjectId; skillKey: string; n: number }[] = [];
  for (const skillKey of assessable) {
    for (let n = 0; n < ITEMS_PER_SKILL; n++) items.push({ _id: stableId(`p27-e2e:item:${skillKey}:${n}`), skillKey, n });
  }
  await AssessmentItem.insertMany(items.map(i => ({
    _id: i._id, tenantId, type: 'mcq', dimension: 'fundamentals', difficulty: 3,
    prompt: `[P27 E2E fixture] ${i.skillKey} item ${i.n + 1}`,
    options: [{ id: 'a', text: 'Fixture right answer' }, { id: 'b', text: 'Fixture wrong answer' }, { id: 'c', text: 'Fixture other answer' }],
    correctOptionIds: ['a'], points: 1, tags: [ITEM_TAG], createdBy: 'p27-e2e-fixture',
    // Ordered, so a document the model refuses throws here instead of being skipped silently.
  })), { ordered: true });
  const storedItems = await AssessmentItem.countDocuments({ tenantId, tags: ITEM_TAG });
  check('fixtures', 'every diagnostic fixture item was stored', storedItems === items.length, `${storedItems}/${items.length}`);
  rawLog(`  fixture diagnostic items: ${storedItems} over ${assessable.length} assessable stage skills`);

  let attemptNo = 0;
  const sitDiagnostic = async (key: string, correctOf: (skillKey: string, n: number) => boolean) => {
    const s = students[key];
    attemptNo++;
    await PersonalizedAssessment.create({
      tenantId, studentId: new mongoose.Types.ObjectId(s.id), attemptNumber: attemptNo, status: 'IN_PROGRESS', purpose: 'INITIAL',
      policyKey: 'P27_E2E_FIXTURE', policyVersion: 1, stage: CASES.find(c => c.key === key)?.stage || 'foundation', roleKey: 'NOT_SURE',
      generationSeed: `p27-e2e:${key}:${attemptNo}`,
      specification: { slots: items.map(i => ({ skillKey: i.skillKey, difficulty: 'MEDIUM', reason: 'p27-e2e fixture' })), totalPoints: items.length },
      items: items.map((i, order) => ({ sourceType: 'assessment_item', sourceId: String(i._id), skillKey: i.skillKey, difficulty: 'MEDIUM', order, points: 1 })),
    } as any);
    const answers = items.map(i => ({ sourceType: 'assessment_item', sourceId: String(i._id), response: [correctOf(i.skillKey, i.n) ? 'a' : 'b'] }));
    const mark = logMark();
    const res = await as(s.token, request(api).post('/api/v1/careerpilot/me/assessment/personalized/submit')).send({ answers });
    return { res, mark };
  };

  /** Wait for the planner to finish the trigger this student just caused, and say which engine took it. */
  const awaitRouting = async (studentId: string, trigger: string, mark: number, engine: 'UNIT' | 'TOPIC') => {
    const unitRe = new RegExp(`\\[curriculum-engine\\] ${trigger} for ${studentId} → UNIT (\\w+)`);
    const topicRe = new RegExp(`\\[adaptive\\] (no plan for|first plan for|replanned|replan recommended for) ${studentId}`);
    const ok = await waitFor(() => !!logSince(mark, engine === 'UNIT' ? unitRe : topicRe), 180_000);
    const line = logSince(mark, engine === 'UNIT' ? unitRe : topicRe);
    const action = engine === 'UNIT' ? (line?.match(unitRe)?.[1] || null) : 'TOPIC';
    return { ok, action, line, crossed: !!logSince(mark, engine === 'UNIT' ? topicRe : unitRe) };
  };

  /* ── journey inspection ─────────────────────────────────────────────────────────────── */

  const byCode = new Map<string, ComposableUnit>(production.units.map(u => [u.unitCode, u]));
  const NO_ASSETS: UnitAssets = { content: [], quizzes: [], assignments: [] };
  const dayActivityProblems = (u: ComposableUnit, items: any[], a: UnitAssets): string[] => {
    if (!items.length) return ['no activities'];
    const problems: string[] = [];
    const content = items.filter(i => i.kind === 'content');
    if (typeRequiresTeaching(u.unitType) && !content.some(i => teaches(String(i.contentType)))) problems.push('no teaching of its own');
    if (['PRACTICE', 'DEBUG'].includes(u.unitType) && !content.some(i => roleOf(String(i.contentType)) === 'PRACTISE')) problems.push('no practice of its own');
    if (u.unitType === 'CHECKPOINT' && !items.some(i => i.kind === 'quiz' && i.isGating)) problems.push('no gating quiz');
    if (u.unitType === 'PROJECT' && !items.some(i => i.kind === 'assignment' && i.isGating)) problems.push('no gating assignment');
    const firstGate = items.findIndex(i => i.isGating);
    const lastOpen = items.map(i => !i.isGating).lastIndexOf(true);
    if (firstGate >= 0 && lastOpen > firstGate) problems.push('gating activity is not last');
    const own = new Set(a.content.filter(r => String(r.unitCode).toUpperCase() === u.unitCode.toUpperCase()).map(r => String(r._id)));
    if (content.some(i => !own.has(String(i.contentId)))) problems.push('inherited content present');
    return problems;
  };

  const inspectJourney = async (key: string) => {
    const sid = new mongoose.Types.ObjectId(students[key].id);
    const curricula = await LearningCurriculum.find({ tenantId, personalizedFor: sid, journeyKind: FOUNDATION_JOURNEY_KIND }).lean() as any[];
    const curriculum = curricula[0];
    const days = curriculum ? await DayPlan.find({ curriculumId: curriculum._id }).sort({ dayNumber: 1 }).lean() as any[] : [];
    const enrollments = curriculum ? await CurriculumEnrollment.find({ curriculumId: curriculum._id, studentId: sid }).lean() as any[] : [];
    const problems: string[] = [];
    if (curricula.length !== 1) problems.push(`${curricula.length} journeys`);
    if (curriculum && curriculum.journeySource !== 'PRODUCTION') problems.push(`source ${curriculum.journeySource}`);
    if (days.length !== FOUNDATION_PROGRAM_DAYS) problems.push(`${days.length} DayPlans`);
    const numbers = days.map(d => d.dayNumber);
    if (JSON.stringify(numbers) !== JSON.stringify(Array.from({ length: FOUNDATION_PROGRAM_DAYS }, (_, i) => i + 1))) problems.push('day numbers are not exactly 1..90');
    const codes = days.map(d => String(d.primaryUnitCode || ''));
    if (codes.some(c => !c)) problems.push('a day without primaryUnitCode');
    if (new Set(codes).size !== codes.length) problems.push('a unit scheduled twice');
    const outside = codes.filter(c => !certifiedSet.has(c));
    if (outside.length) problems.push(`non-production units: ${outside.slice(0, 3).join(', ')}`);
    if (enrollments.length !== 1) problems.push(`${enrollments.length} enrolments`);
    const assets = await loadAssets(tenantId, codes);
    const position = new Map(codes.map((c, i) => [c, i]));
    /**
     * Prerequisites judged by the composer's own rule, as the certifier judges them: scheduled
     * earlier, or already mastered on the student's measured Skill DNA. A prerequisite the learner
     * has verified may reappear later as revision — that is a revisit, not a dependent unit
     * jumping its queue.
     */
    const dna = await getSkillDna(tenantId, students[key].id);
    const measured = { skills: new Map(dna.map(r => [r.skillKey, { score: r.score, confidence: r.confidence as any }])) } as any;
    const masteryRevisits: string[] = [];
    let checkpointDays = 0; let projectDays = 0;
    for (const d of days) {
      const u = byCode.get(String(d.primaryUnitCode));
      if (!u) continue;
      for (const p of dayActivityProblems(u, d.items || [], assets.get(u.unitCode.toUpperCase()) || NO_ASSETS)) problems.push(`day ${d.dayNumber} ${u.unitCode}: ${p}`);
      for (const pre of u.prerequisiteUnitCodes) {
        const at = position.get(pre);
        if (at === undefined || at <= d.dayNumber - 1) continue;
        if (masteredBy(pre, u, byCode, measured)) masteryRevisits.push(`day ${d.dayNumber} ${u.unitCode} ← ${pre} (mastered, revisited day ${at + 1})`);
        else problems.push(`day ${d.dayNumber} ${u.unitCode} before its prerequisite ${pre}, which is not mastered`);
      }
      if ((d.items || []).some((i: any) => i.kind === 'quiz')) checkpointDays++;
      if ((d.items || []).some((i: any) => i.kind === 'assignment')) projectDays++;
    }
    return { curriculum, days, enrollment: enrollments[0], problems, masteryRevisits, checkpointDays, projectDays };
  };

  const snapshotDays = (days: any[], numbers: number[]) =>
    JSON.stringify(days.filter(d => numbers.includes(d.dayNumber)).map(d => [d.dayNumber, d.primaryUnitCode, (d.items || []).map((i: any) => [i.kind, String(i.contentId || i.sourceId)])]));

  /* ══ 5. REAL UNIT JOURNEY CREATION ════════════════════════════════════════════════════════ */

  section('5. REAL JOURNEY CREATION — diagnostic submitted by the student → Skill DNA → event → engine');
  for (const c of CASES) {
    await createStudent(c.key, c.stage, c.role);
    const { res, mark } = await sitDiagnostic(c.key, (_skill, n) => n < c.correct);
    check('journey', `${c.key}: diagnostic submitted through the student endpoint`, res.status === 200, `HTTP ${res.status}`);
    const routed = await awaitRouting(students[c.key].id, 'DIAGNOSTIC_COMPLETED', mark, c.engine);
    const dna = await getSkillDna(tenantId, students[c.key].id);
    const states = dna.reduce((m: Record<string, number>, r) => { const s = stateForScore({ score: r.score, confidence: r.confidence as any }); m[s] = (m[s] || 0) + 1; return m; }, {});
    check('journey', `${c.key}: Skill DNA projected from the paper`, dna.length === assessable.length, `${dna.length} skills ${JSON.stringify(states)}`);

    if (c.engine === 'TOPIC') {
      check('topic', 'TOPIC control: the event reached the TOPIC replanner', routed.ok, routed.line || 'no TOPIC replanner log');
      check('topic', 'TOPIC control: it never entered UNIT journey creation', !routed.crossed
        && !(await LearningCurriculum.countDocuments({ personalizedFor: new mongoose.Types.ObjectId(students[c.key].id), journeyKind: FOUNDATION_JOURNEY_KIND })));
      continue;
    }
    check('journey', `${c.key}: routed to UNIT and a journey was created`, routed.ok && routed.action === 'CREATED', routed.line || 'no routing log');
    const j = await inspectJourney(c.key);
    check('journey', `${c.key}: 1 journey, 90 DayPlans 1..90, unique units, production only, complete activities, prerequisites in order`,
      !j.problems.length, j.problems.slice(0, 4).join(' | ') || `${j.checkpointDays} checkpoint days, ${j.projectDays} project days`);

    // Retry: the same event delivered again reaches the same journey and duplicates nothing.
    const again = logMark();
    const beforeRetry = snapshotDays(j.days, j.days.map((d: any) => d.dayNumber));
    await publish({ name: 'DIAGNOSTIC_COMPLETED', tenantId, studentId: students[c.key].id });
    const retried = await awaitRouting(students[c.key].id, 'DIAGNOSTIC_COMPLETED', again, 'UNIT');
    const j2 = await inspectJourney(c.key);
    check('retry', `${c.key}: a repeated trigger creates no second journey and no duplicate days`,
      retried.ok && retried.action !== 'CREATED' && !j2.problems.length && snapshotDays(j2.days, j2.days.map((d: any) => d.dayNumber)) === beforeRetry,
      retried.line || '');
  }

  // A real second submission — the trigger itself retried, not only the event.
  {
    const { res, mark } = await sitDiagnostic('beginner', (_s, n) => n < 1);
    const routed = await awaitRouting(students.beginner.id, 'DIAGNOSTIC_COMPLETED', mark, 'UNIT');
    const j = await inspectJourney('beginner');
    check('retry', 'beginner: a second real diagnostic submission still leaves exactly one valid journey',
      res.status === 200 && routed.ok && routed.action !== 'CREATED' && !j.problems.length, routed.line || '');
  }

  // Everything below acts on the journeys created above. Without them it would only crash.
  const journeysReady = (await Promise.all(CASES.filter(c => c.engine === 'UNIT')
    .map(async c => (await inspectJourney(c.key)).problems.length === 0))).every(Boolean);
  if (!journeysReady) check('journey', 'journey-dependent sections 6–9 could run', false, 'a UNIT student has no valid journey; skipped to cleanup');
  if (journeysReady) {

  /* ══ 6. JOURNEY API — WHAT THE STUDENT IS SENT ════════════════════════════════════════════ */

  section('6. JOURNEY API — /careerpilot/me/foundation-journey as the student');
  {
    const s = students.direction;
    const j = await inspectJourney('direction');
    const overview = await as(s.token, request(api).get('/api/v1/careerpilot/me/foundation-journey'));
    check('ux', 'overview: available, Day 1 of 90, progress 0%, a 90-day strip', overview.status === 200 && overview.body?.available === true
      && overview.body?.totalDays === 90 && overview.body?.currentDay === 1 && overview.body?.percentComplete === 0 && (overview.body?.days || []).length === 90);
    // What My Roadmap and My 90 Days decide on, and where their "Start today's work" button goes.
    check('ux', 'overview names the unit engine and the enrolment the Start button opens',
      overview.body?.engine === 'UNIT' && !!j.enrollment && overview.body?.enrollmentId === String(j.enrollment._id),
      `${overview.body?.engine} ${overview.body?.enrollmentId}`);
    const player = await as(s.token, request(api).get(`/api/v1/enrollment-plans/${overview.body?.enrollmentId}/day/1`));
    check('ux', 'the day player behind the Start button serves day 1 of the journey',
      player.status === 200 && (player.body?.items || []).length > 0, `HTTP ${player.status}, ${(player.body?.items || []).length} item(s)`);
    // The admin's view of the same journey, through the real admin route and its MANAGE guard. Read-only.
    const adminView = await as(adminToken, request(api).get(`/api/v1/careerpilot/students/${s.id}/foundation-journey`));
    const adminDay1 = (adminView.body?.days || [])[0];
    check('admin', 'an admin sees this member’s ninety days with the unit behind each day',
      adminView.status === 200 && adminView.body?.available === true && (adminView.body?.days || []).length === 90
      && adminDay1?.unitCode === j.days[0]?.primaryUnitCode && adminDay1?.unitStatus === 'PUBLISHED',
      `HTTP ${adminView.status}, day 1 ${adminDay1?.unitCode} ${adminDay1?.unitStatus}`);
    const studentPeek = await as(s.token, request(api).get(`/api/v1/careerpilot/students/${s.id}/foundation-journey`));
    check('admin', 'a student cannot open the admin view, even of their own journey', studentPeek.status === 403, `HTTP ${studentPeek.status}`);
    // The topic roadmap API behind My Roadmap refuses a Foundation learner outright — no 21/28-day plan.
    const legacy = await as(s.token, request(api).get('/api/v1/passport/roadmap'));
    check('ux', 'the topic roadmap API answers a Foundation learner with the unit engine, and no topic plan',
      legacy.status === 200 && legacy.body?.engine === 'UNIT' && legacy.body?.roadmap === null && legacy.body?.foundation?.configured === true,
      `HTTP ${legacy.status}, engine ${legacy.body?.engine}, roadmap ${legacy.body?.roadmap === null ? 'null' : 'PRESENT'}`);
    const checkpointDay = j.days.find((d: any) => (d.items || []).some((i: any) => i.kind === 'quiz'))?.dayNumber;
    const projectDay = j.days.find((d: any) => (d.items || []).some((i: any) => i.kind === 'assignment'))?.dayNumber;
    const bodies: any[] = [overview.body];
    for (const n of [1, checkpointDay, projectDay].filter(Boolean) as number[]) {
      const day = await as(s.token, request(api).get(`/api/v1/careerpilot/me/foundation-journey/day/${n}`));
      bodies.push(day.body);
      const acts = day.body?.activities || [];
      const gates = acts.map((a: any) => !!a.gating);
      check('ux', `day ${n}: objective, outcomes, ordered activities with the gate last`, day.status === 200 && !!day.body?.objective
        && Array.isArray(day.body?.outcomes) && acts.length > 0 && (gates.indexOf(true) === -1 || gates.lastIndexOf(false) < gates.indexOf(true)),
        `${acts.length} activities, kinds ${acts.map((a: any) => a.kind).join(',')}`);
      if (n === checkpointDay) check('ux', `day ${n}: the checkpoint is presented as a gating quiz`, acts.some((a: any) => a.kind === 'quiz' && a.gating));
      if (n === projectDay) check('ux', `day ${n}: the project is presented as a gating assignment to submit`, acts.some((a: any) => a.kind === 'assignment' && a.gating));
    }
    const keys = new Set<string>();
    const values: string[] = [];
    const walk = (v: any) => { if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) { keys.add(k); walk(x); } else if (typeof v === 'string') values.push(v); };
    bodies.forEach(walk);
    const forbiddenKeys = ['unitCode', 'primaryUnitCode', 'readiness', 'publicationStatus', 'composer', 'allocation', 'role', 'reason', 'suitableStates', 'score', 'rank', 'certified', 'journeySource', 'journeyKind', 'state', 'governingSkill'];
    const forbiddenValues = /^(READY|PUBLISHED|PARTIAL|DRAFT|ADVANCED_UNIVERSAL|FOUNDATION_INSTRUCTION|GUIDED_INSTRUCTION|DIRECTION_LEARNING|PRODUCTION|T_[A-Z0-9_]+)$/;
    check('ux', 'no composer, readiness, publication, role or certification internals reach the student',
      !forbiddenKeys.some(k => keys.has(k)) && !values.some(v => forbiddenValues.test(v)),
      `${forbiddenKeys.filter(k => keys.has(k)).join(',')} ${values.filter(v => forbiddenValues.test(v)).slice(0, 3).join(',')}`);
  }

  /* ══ 7. PROGRESS, CHECKPOINT AND PROJECT THROUGH THE REAL ROUTES ═════════════════════════ */

  section('7. PROGRESS — content, checkpoint quiz and project completed through the real routes');
  const correctAnswersFor = async (quizId: string, right: boolean) => {
    const quiz = await Quiz.findById(quizId).select('questionIds').lean() as any;
    const qs = await Question.find({ _id: { $in: quiz.questionIds } }).lean() as any[];
    return (quiz.questionIds || []).map(String).map((id: string, i: number) => {
      const q = qs.find(x => String(x._id) === id);
      const opt = (q.options || []).find((o: any) => !!o.isCorrect === right) || q.options[0];
      return { questionId: id, selectedOptions: [String(opt.text)], questionNo: i + 1 };
    });
  };
  const takeCheckpoint = async (key: string, quizId: string, right: boolean) => {
    const s = students[key];
    const questions = await as(s.token, request(api).get(`/api/v1/quizzes/${quizId}/questions`));
    const started = await as(s.token, request(api).post(`/api/v1/quizzes/${quizId}/start`));
    const mark = logMark();
    const submitted = await as(s.token, request(api).post(`/api/v1/quizzes/${quizId}/attempt/${started.body?._id}/submit`))
      .send({ answers: await correctAnswersFor(quizId, right) });
    return { questions, started, submitted, mark };
  };
  const mappedQuiz = async (quizId: string) => {
    const quiz = await Quiz.findById(quizId).select('questionIds').lean() as any;
    return SkillEvidence.countDocuments({ tenantId, sourceType: 'question', sourceId: { $in: (quiz.questionIds || []).map(String) }, contribution: 'PRIMARY', active: true });
  };
  const completeDay = async (key: string, dayNumber: number) => {
    const s = students[key];
    const j = await inspectJourney(key);
    const day = j.days.find((d: any) => d.dayNumber === dayNumber);
    const enrollmentId = String(j.enrollment._id);
    let evidenceEvent: string | null = null;
    for (const item of (day.items || []).filter((i: any) => i.kind === 'quiz')) {
      const mapped = await mappedQuiz(String(item.sourceId));
      const t = await takeCheckpoint(key, String(item.sourceId), true);
      check('checkpoint', `${key} day ${dayNumber}: checkpoint questions delivered, attempt started and submitted`,
        t.questions.status === 200 && (t.questions.body || []).length > 0 && t.started.status === 201 && t.submitted.status === 200,
        `${(t.questions.body || []).length} questions, HTTP ${t.started.status}/${t.submitted.status}, ${mapped} mapped`);
      if (mapped) {
        const routed = await awaitRouting(s.id, 'MODULE_ASSESSMENT_COMPLETED', t.mark, 'UNIT');
        evidenceEvent = routed.line;
      }
    }
    for (const item of (day.items || []).filter((i: any) => i.kind === 'assignment')) {
      const started = await as(s.token, request(api).post(`/api/v1/assignments/${item.sourceId}/start`));
      const sub = started.body?.submission?._id || started.body?._id || started.body?.data?._id;
      const submitted = await as(s.token, request(api).post(`/api/v1/assignments/submissions/${sub}/submit-theory`))
        .send({ theoryAnswer: 'P27 E2E fixture submission: the project brief was followed and the work is described here.' });
      check('project', `${key} day ${dayNumber}: project assignment started and submitted`, started.status === 201 && submitted.status === 200,
        `HTTP ${started.status}/${submitted.status}`);
    }
    let last: any = null;
    for (const item of (day.items || []).filter((i: any) => i.kind === 'content')) {
      last = await as(s.token, request(api).patch(`/api/v1/enrollment-plans/${enrollmentId}/complete-item`))
        .send({ contentId: String(item.contentId), dayNumber });
    }
    return { completedDays: last?.body?.completedDays || [], currentDay: last?.body?.currentDay, evidenceEvent };
  };

  const evidenceBefore = await StudentSkillEvidence.countDocuments({ tenantId, studentId: students.direction.id });
  const d1 = await completeDay('direction', 1);
  const d2 = await completeDay('direction', 2);
  check('checkpoint', 'direction: days 1 and 2 complete through the real routes, and the student is on day 3',
    d2.completedDays.includes(1) && d2.completedDays.includes(2) && d2.currentDay === 3, `completed ${d2.completedDays} current ${d2.currentDay}`);
  const evidenceAfter = await StudentSkillEvidence.countDocuments({ tenantId, studentId: students.direction.id });
  check('checkpoint→replan', 'a mapped checkpoint recorded skill evidence and reached UNIT recomposition',
    evidenceAfter > evidenceBefore && !!(d1.evidenceEvent || d2.evidenceEvent), `${evidenceBefore} → ${evidenceAfter}; ${d1.evidenceEvent || d2.evidenceEvent || 'no routed checkpoint event'}`);

  // A project in the student's future, submitted through the assignment routes it is delivered by.
  {
    const j = await inspectJourney('direction');
    const projectDay = j.days.find((d: any) => d.dayNumber > 2 && (d.items || []).some((i: any) => i.kind === 'assignment'));
    if (projectDay) {
      const item = projectDay.items.find((i: any) => i.kind === 'assignment');
      const started = await as(students.direction.token, request(api).post(`/api/v1/assignments/${item.sourceId}/start`));
      const sub = started.body?.submission?._id || started.body?._id || started.body?.data?._id;
      const submitted = await as(students.direction.token, request(api).post(`/api/v1/assignments/submissions/${sub}/submit-theory`))
        .send({ theoryAnswer: 'P27 E2E fixture project submission describing the finished work.' });
      const stored = await db.collection('submissions').findOne({ _id: new mongoose.Types.ObjectId(String(sub)) });
      check('project', `direction day ${projectDay.dayNumber}: the draft curriculum assignment is delivered, started and submitted`,
        started.status === 201 && submitted.status === 200 && ['submitted', 'late'].includes(String(stored?.status).toLowerCase()),
        `HTTP ${started.status}/${submitted.status}, status ${stored?.status}`);
    } else {
      check('project', 'direction: a project day exists in the journey', false, 'none found');
    }
  }

  // An intentionally unmapped multi-skill checkpoint grades normally and records no evidence.
  {
    const quizzes = await Quiz.find({ tenantId, unitCode: { $exists: true, $nin: ['', null] } }).select('_id unitCode questionIds').lean() as any[];
    let unmapped: any = null;
    for (const q of quizzes) { if (!(await mappedQuiz(String(q._id)))) { unmapped = q; break; } }
    const evBefore = await StudentSkillEvidence.countDocuments({ tenantId, studentId: students.strong.id });
    const t = await takeCheckpoint('strong', String(unmapped._id), true);
    await sleep(3000);
    const evAfter = await StudentSkillEvidence.countDocuments({ tenantId, studentId: students.strong.id });
    check('checkpoint', `unmapped quiz ${unmapped.unitCode}: delivered and graded, but no skill evidence and no replan`,
      t.questions.status === 200 && (t.questions.body || []).length > 0 && t.submitted.status === 200 && evAfter === evBefore
      && !logSince(t.mark, new RegExp(`MODULE_ASSESSMENT_COMPLETED for ${students.strong.id}`)), `${evBefore} → ${evAfter}`);
  }

  /* ══ 8. REPLANNING THROUGH THE REAL EVENTS ═════════════════════════════════════════════════ */

  section('8. CONTINUOUS PERSONALISATION — future-only recomposition from real events');
  const replanAcceptance = async (area: string, key: string, label: string, act: () => Promise<{ mark: number; trigger: string; status: number }>) => {
    const before = await inspectJourney(key);
    const frozen = [...new Set([...(before.enrollment?.completedDays || []), Number(before.enrollment?.currentDay || 1)])];
    const frozenBefore = snapshotDays(before.days, frozen);
    const dnaBefore = await getSkillDna(tenantId, students[key].id);
    const { mark, trigger, status } = await act();
    const routed = await awaitRouting(students[key].id, trigger, mark, 'UNIT');
    const after = await inspectJourney(key);
    const dnaAfter = await getSkillDna(tenantId, students[key].id);
    const changedFuture = after.days.filter((d: any) => !frozen.includes(d.dayNumber)
      && String(before.days.find((b: any) => b.dayNumber === d.dayNumber)?.primaryUnitCode) !== String(d.primaryUnitCode)).length;
    const newlyVerified = dnaAfter.filter(r => stateForScore({ score: r.score, confidence: r.confidence as any }) === 'VERIFIED'
      && stateForScore({ score: dnaBefore.find(b => b.skillKey === r.skillKey)?.score ?? null, confidence: (dnaBefore.find(b => b.skillKey === r.skillKey)?.confidence as any) ?? null }) !== 'VERIFIED').length;
    check(area, `${key}: ${label} — routed to UNIT recomposition`, status < 300 && routed.ok && ['RECOMPOSED', 'UNCHANGED'].includes(String(routed.action)), routed.line || `HTTP ${status}`);
    check(area, `${key}: completed and current days [${frozen.join(',')}] unchanged, only future days rewritten`, snapshotDays(after.days, frozen) === frozenBefore,
      `${changedFuture} future day(s) changed`);
    check(area, `${key}: still exactly 90 valid days — unique units, production only, activities complete, prerequisites in order`,
      !after.problems.length, after.problems.slice(0, 3).join(' | ')
        || (after.masteryRevisits.length ? `prerequisites satisfied by mastery: ${after.masteryRevisits.slice(0, 3).join(' | ')}` : ''));
    return { changedFuture, newlyVerified, action: routed.action };
  };

  const improvement = await replanAcceptance('assessment→replan', 'direction', 'improvement and newly verified skills (two diagnostics, all correct)', async () => {
    // One all-correct paper after a 3/5 paper averages 80 — REVISION. A second carries the
    // weighted score past the VERIFIED band, which is what "newly verified" has to mean.
    const first = await sitDiagnostic('direction', () => true);
    await awaitRouting(students.direction.id, 'DIAGNOSTIC_COMPLETED', first.mark, 'UNIT');
    const { res, mark } = await sitDiagnostic('direction', () => true);
    return { mark, trigger: 'DIAGNOSTIC_COMPLETED', status: first.res.status < 300 ? res.status : first.res.status };
  });
  check('assessment→replan', 'direction: the new evidence verified skills that were not verified before', improvement.newlyVerified > 0, `${improvement.newlyVerified} newly VERIFIED, ${improvement.changedFuture} future days changed`);

  const struggle = await replanAcceptance('assessment→replan', 'boundary', 'struggle (diagnostic, all wrong)', async () => {
    const { res, mark } = await sitDiagnostic('boundary', () => false);
    return { mark, trigger: 'DIAGNOSTIC_COMPLETED', status: res.status };
  });
  rawLog(`  struggle: ${struggle.changedFuture} future day(s) changed (${struggle.action})`);

  await replanAcceptance('checkpoint→replan', 'direction', 'checkpoint evidence (a future checkpoint failed)', async () => {
    const j = await inspectJourney('direction');
    let quizId = '';
    for (const d of j.days.filter((x: any) => x.dayNumber > 3)) {
      const q = (d.items || []).find((i: any) => i.kind === 'quiz');
      if (q && await mappedQuiz(String(q.sourceId))) { quizId = String(q.sourceId); break; }
    }
    const t = await takeCheckpoint('direction', quizId, false);
    return { mark: t.mark, trigger: 'MODULE_ASSESSMENT_COMPLETED', status: t.submitted.status };
  });

  const direction = await replanAcceptance('direction→replan', 'undecided', 'direction change through career context (NOT_SURE → FRONTEND_ENGINEER)', async () => {
    const s = students.undecided;
    const ctx = await as(s.token, request(api).get('/api/v1/careerpilot/me/context')); // the setup screen; seeds default roles
    const mark = logMark();
    const res = await as(s.token, request(api).put('/api/v1/careerpilot/me/context')).send({ primaryRole: 'FRONTEND_ENGINEER' });
    rawLog(`  context GET ${ctx.status}, PUT ${res.status}${res.body?.message ? ` (${res.body.message})` : ''}`);
    return { mark, trigger: 'DIRECTION_CHANGED', status: res.status };
  });
  rawLog(`  direction change: ${direction.changedFuture} future day(s) changed (${direction.action})`);

  // TOPIC equivalents: the same kinds of event, for a learner the resolver keeps on TOPIC.
  {
    const s = students['topic-control'];
    const { res, mark } = await sitDiagnostic('topic-control', () => true);
    const routed = await awaitRouting(s.id, 'DIAGNOSTIC_COMPLETED', mark, 'TOPIC');
    check('topic', 'TOPIC control: a later diagnostic again reaches only the TOPIC replanner', res.status === 200 && routed.ok && !routed.crossed, routed.line || '');
    await as(s.token, request(api).get('/api/v1/careerpilot/me/context'));
    const m2 = logMark();
    const put = await as(s.token, request(api).put('/api/v1/careerpilot/me/context')).send({ primaryRole: 'FRONTEND_ENGINEER' });
    await sleep(3000);
    check('topic', 'TOPIC control: a direction change is not replanned and never reaches UNIT, exactly as before',
      put.status === 200
      // Planner lines only — the auth middleware logs every token's user id.
      && !logSince(m2, new RegExp(`\\[(curriculum-engine|adaptive)\\].*${s.id}`))
      && !(await LearningCurriculum.countDocuments({ personalizedFor: new mongoose.Types.ObjectId(s.id), journeyKind: FOUNDATION_JOURNEY_KIND })),
      `HTTP ${put.status}`);
    const legacy = await as(s.token, request(api).get('/api/v1/passport/roadmap'));
    check('topic', 'TOPIC control: a later-stage learner is still served by the topic roadmap API, not the unit engine',
      legacy.status === 200 && legacy.body?.engine !== 'UNIT', `HTTP ${legacy.status}, engine ${legacy.body?.engine || 'topic'}`);
  }

  /* ══ 9. FAILURE PATHS ═════════════════════════════════════════════════════════════════════ */

  section('9. FAILURE PATHS');
  {
    const nobody = await createStudent('no-evidence', 'foundation', 'NOT_SURE');
    const mark = logMark();
    await publish({ name: 'DIRECTION_CHANGED', tenantId, studentId: nobody.id });
    const routed = await awaitRouting(nobody.id, 'DIRECTION_CHANGED', mark, 'UNIT');
    check('failure', 'a UNIT student with no Skill DNA is not given a journey', routed.action === 'NOT_READY'
      && !(await LearningCurriculum.countDocuments({ personalizedFor: new mongoose.Types.ObjectId(nobody.id) })), routed.line || '');
  }
  {
    const j = await inspectJourney('undecided');
    await DayPlan.deleteOne({ curriculumId: j.curriculum._id, dayNumber: 90 });
    const survivors = snapshotDays((await DayPlan.find({ curriculumId: j.curriculum._id }).sort({ dayNumber: 1 }).lean()) as any[], Array.from({ length: 89 }, (_, i) => i + 1));
    const mark = logMark();
    await publish({ name: 'SKILL_MASTERY_CHANGED', tenantId, studentId: students.undecided.id });
    const routed = await awaitRouting(students.undecided.id, 'SIGNIFICANT_MASTERY_CHANGE', mark, 'UNIT');
    const after = await DayPlan.find({ curriculumId: j.curriculum._id }).sort({ dayNumber: 1 }).lean() as any[];
    check('failure', 'a journey that is no longer ninety days is refused, and nothing is rewritten around it',
      routed.action === 'REFUSED' && after.length === 89 && snapshotDays(after, Array.from({ length: 89 }, (_, i) => i + 1)) === survivors, routed.line || '');
  }

  /* ══ 9b. EXISTING MEMBERS — BACKFILL ══════════════════════════════════════════════════════ */

  section('9b. EXISTING MEMBERS — a member assessed before activation is given their journey by the backfill');
  {
    // Scoped to this run's own fixtures, so the backfill can never plan a real member here.
    const scope = ['strong', 'topic-control', 'no-evidence'].map(k => students[k].id);
    const decisionOf = (r: any, key: string) => r.rows.find((x: any) => x.studentId === students[key].id)?.decision;
    const strongOid = new mongoose.Types.ObjectId(students.strong.id);
    // As somebody assessed before the engine was switched on: Skill DNA, but no journey and no enrolment.
    const original = await inspectJourney('strong');
    await CurriculumEnrollment.deleteMany({ curriculumId: original.curriculum._id });
    await deleteFoundationJourney(tenantId, students.strong.id);

    const dry = await backfillFoundationJourneys({ tenantId, apply: false, studentIds: scope });
    check('backfill', 'dry run: only the measured UNIT member without a journey would be given one, and nothing is written',
      decisionOf(dry, 'strong') === 'WOULD_CREATE' && decisionOf(dry, 'topic-control') === 'TOPIC_ENGINE' && decisionOf(dry, 'no-evidence') === 'NOT_READY'
      && !(await LearningCurriculum.countDocuments({ personalizedFor: strongOid, journeyKind: FOUNDATION_JOURNEY_KIND })),
      dry.rows.map(r => `${r.email.split('@')[0]} ${r.decision}`).join(', '));

    const applied = await backfillFoundationJourneys({ tenantId, apply: true, studentIds: scope });
    const rebuilt = await inspectJourney('strong');
    check('backfill', 'apply: that member has exactly one ninety-day journey and one enrolment, written by the production trigger',
      applied.created === 1 && applied.notCreated === 0 && !rebuilt.problems.length,
      rebuilt.problems.slice(0, 3).join(' | ') || `created ${applied.created}`);

    const again = await backfillFoundationJourneys({ tenantId, apply: true, studentIds: scope });
    check('backfill', 'a second run creates nothing', again.created === 0 && decisionOf(again, 'strong') === 'HAS_JOURNEY');
  }

  /* ══ 9c. MEMBERSHIP — PREVIEW, THEN THE NINETY DAYS ═══════════════════════════════════════ */

  section('9c. MEMBERSHIP — a non-member sees only the preview; membership generates the ninety days');
  {
    const s = await createStudent('preview', 'foundation', 'NOT_SURE');
    const sOid = new mongoose.Types.ObjectId(s.id);
    await User.updateOne({ _id: sOid }, { $set: { 'passport.active': false } });
    const cfgDoc = await db.collection('passportconfigs').findOne({ tenantId });
    const previewDays = clampPreviewDays(cfgDoc?.roadmapPreviewDays);

    const { res, mark } = await sitDiagnostic('preview', (_k, n) => n % 2 === 0);
    const routed = await awaitRouting(s.id, 'DIAGNOSTIC_COMPLETED', mark, 'UNIT');
    check('membership', 'a non-member’s skill check measures them but stores no journey',
      res.status === 200 && routed.action === 'NOT_READY' && /MEMBERSHIP_REQUIRED/.test(String(routed.line))
        && !(await LearningCurriculum.countDocuments({ personalizedFor: sOid, journeyKind: FOUNDATION_JOURNEY_KIND })),
      routed.line || '');

    const preview = await as(s.token, request(api).get('/api/v1/careerpilot/me/foundation-journey'));
    check('membership', `their roadmap shows only the first ${previewDays} days of their own plan, the rest locked`,
      preview.status === 200 && preview.body?.access === 'PREVIEW' && (preview.body?.days || []).length === previewDays
        && (preview.body?.preview || []).length === previewDays && preview.body?.lockedDays === 90 - previewDays
        && preview.body?.totalDays === 90 && !preview.body?.enrollmentId && !!preview.body?.preview?.[0]?.title,
      `access ${preview.body?.access}, ${(preview.body?.days || []).length} day(s), locked ${preview.body?.lockedDays}`);
    const beyond = await as(s.token, request(api).get(`/api/v1/careerpilot/me/foundation-journey/day/${previewDays + 1}`));
    check('membership', 'a day beyond the preview is refused on the server', beyond.status === 403, `HTTP ${beyond.status}`);
    const legacy = await as(s.token, request(api).get('/api/v1/passport/roadmap'));
    check('membership', 'and they are never given the topic roadmap instead', legacy.body?.engine === 'UNIT' && legacy.body?.roadmap === null);

    const grant = await as(adminToken, request(api).post(`/api/v1/careerpilot/members/${s.id}/grant`)).send({ days: 30, reason: 'p27-e2e membership acceptance' });
    const full = await as(s.token, request(api).get('/api/v1/careerpilot/me/foundation-journey'));
    const journeyDoc = await LearningCurriculum.findOne({ personalizedFor: sOid, journeyKind: FOUNDATION_JOURNEY_KIND }).lean() as any;
    const stored = journeyDoc ? await DayPlan.countDocuments({ curriculumId: journeyDoc._id }) : 0;
    check('membership', 'membership generates their full ninety days, unlocked',
      grant.status === 200 && full.body?.access === 'FULL' && full.body?.available === true && (full.body?.days || []).length === 90
        && !!full.body?.enrollmentId && stored === 90 && journeyDoc?.journeySource === 'PRODUCTION',
      `grant HTTP ${grant.status}, access ${full.body?.access}, ${(full.body?.days || []).length} day(s), ${stored} DayPlans`);
    check('membership', 'the ninety days begin with the days the preview showed — the same Skill DNA, the same plan',
      (preview.body?.preview || []).every((d: any, i: number) => full.body?.days?.[i]?.title === d.title),
      `${(preview.body?.preview || []).map((d: any) => d.title).slice(0, 3).join(' | ')}`);
  }

  } // journeysReady

  /* ══ 10. CLEANUP AND FINAL STATE ══════════════════════════════════════════════════════════ */

  section('10. CLEANUP AND FINAL STATE');
  await sleep(2000);
  const syntheticIds = Object.values(students).map(s => s.id);
  const syntheticJourneys = (await db.collection('learningcurriculums')
    .find({ personalizedFor: { $in: syntheticIds.map(id => new mongoose.Types.ObjectId(id)) } }).project({ _id: 1 }).toArray()).map(j => j._id);
  await cleanup('after');
  const residue = await syntheticResidue(syntheticIds, syntheticJourneys);
  check('cleanup', 'every synthetic student, item, paper, evidence row, journey, DayPlan, enrolment and role fixture is gone',
    !residue.length, residue.join('; ') || `${syntheticIds.length} fixture students and ${syntheticJourneys.length} fixture journeys removed`);
  const contentFinal = await contentCounts();
  const contentDrift = CONTENT.filter(c => contentBaseline[c] !== contentFinal[c]).map(c => `${c} ${contentBaseline[c]} → ${contentFinal[c]}`);
  check('final', "this tenant's curriculum and assessment content is exactly as the run found it", !contentDrift.length, contentDrift.join('; '));
  const fpAfter = await unitFingerprint();
  const prodFinal = (await loadCandidates(tenantId, 'PRODUCTION')).units.map(u => u.unitCode).sort();
  check('final', 'unit fingerprint unchanged by the run', fpAfter.hash === fpBefore.hash, fpAfter.hash);
  check('final', 'PUBLISHED 338 and PRODUCTION inventory exactly the certified set', fpAfter.published === 338 && JSON.stringify(prodFinal) === JSON.stringify(certified));
  const membersJourneysAfter = await db.collection('learningcurriculums').countDocuments({ tenantId: TID, journeyKind: { $exists: true, $ne: null } });
  rawLog(`  this tenant's members hold ${membersJourneysAfter} Foundation journey(s) (${membersJourneys} at the start; real members may be working)`);
  check('final', 'Foundation still resolves to UNIT and the tenant is still provisioned',
    effectiveCurriculumEngine({ stageKey: 'foundation' }).engine === 'UNIT' && (await foundationReadiness(tenantId)).configured);
  check('final', 'quiz linkage still intact', (await checkCurriculumQuizLinkage(tenantId)).ok);

  rawLog(`\nAREAS: ${Object.entries(results).map(([k, v]) => `${k}=${v ? 'PASS' : 'FAIL'}`).join('  ')}`);
  rawLog(`${failures.length ? 'PHASE 27 E2E: FAIL' : 'PHASE 27 E2E: PASS'} — ${passed} checks passed${failures.length ? `, ${failures.length} failed` : ''}`);
  for (const f of failures) rawLog(`  FAIL  ${f}`);
  await mongoose.disconnect();
  process.exit(failures.length ? 1 : 0);
})().catch(async e => {
  rawError('E2E aborted:', e?.stack || e);
  try { await mongoose.disconnect(); } catch { /* closing */ }
  process.exit(1);
});
