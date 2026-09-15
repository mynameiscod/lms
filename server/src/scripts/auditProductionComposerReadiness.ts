/**
 * Phase 21 — can the QA-passed READY curriculum become the production composer inventory?
 *
 * READ ONLY WITH RESPECT TO THE DATABASE. It publishes nothing, changes no status, creates no
 * journey and no DayPlan, and proves it: the relevant collections are fingerprinted before and
 * after, and the run fails if anything moved.
 *
 *   npx ts-node src/scripts/auditProductionComposerReadiness.ts <tenantId>
 *   npx ts-node src/scripts/auditProductionComposerReadiness.ts <tenantId> --write-artifacts
 *
 * `--write-artifacts` writes the READY inventory and the proposed publish sets to
 * src/tests/fixtures/phase21/, which is the only thing this script ever writes, and it is a file.
 *
 * ── WHAT A PUBLISH SET IS JUDGED ON ───────────────────────────────────────────────────────
 *
 * A set is composed as an isolated candidate pool — exactly the pool PRODUCTION would return if
 * those codes were PUBLISHED — and every plan is re-audited by composerCertificationService,
 * not merely counted. Two sets are reported and they answer different questions:
 *
 *   ABSOLUTE MINIMUM      the smallest prerequisite-closed set that gives all nine realistic
 *                         profiles a plan NO WORSE than the full READY inventory gives them.
 *                         Locally minimal: removing any single remaining unit makes at least one
 *                         profile worse. A measure of how thin the margin is, not a recommendation.
 *
 *   RECOMMENDED           every unit used by any learner state the READY inventory can serve —
 *                         the nine profiles, their recompositions after new evidence, and a
 *                         288-cell sweep of learner states — plus every checkpoint, review and
 *                         project, closed under prerequisites. It must lose nothing the full READY
 *                         inventory achieves. A set that can build one initial plan but not the
 *                         next recomposition is not production-safe.
 *
 * ── "NO WORSE THAN READY", NOT "PERFECT" ──────────────────────────────────────────────────
 *
 * A publish set can only remove units, so it cannot fix a defect the READY inventory itself
 * produces. Judging subsets against perfection would make every subset fail for the same reason
 * READY does, and the search would learn nothing. Defects READY produces are reported once, as
 * findings about the composer or the curriculum, and subsets are held to not adding any.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { loadCandidates } from '../services/composerCandidateService';
import { composeFoundationJourney } from '../services/foundationJourneyService';
import { ComposableUnit, StudentProfile } from '../services/curriculumComposerService';
import {
  REALISTIC_PROFILES, PROGRAM_DAYS, EVOLUTIONS, compose, validatePlan, isDeterministic,
  skillUniverse, prerequisiteClosure, simulateRecomposition, robustnessGrid,
  directionFamilyMix, withoutCoreAffinity, coreModuleUse, measuredStateOf, isRelevant,
  permanentlyUnsuitable, PlanReport, RecompositionReport, Issue,
} from '../services/composerCertificationService';
import { compositionRoleOf } from '../data/compositionShapePolicy';
import { suitableStatesFor } from '../data/unitSuitabilityPolicy';
import { isCoreModuleFor } from '../data/careerDirectionPolicy';
import { typeRequiresTeaching } from '../data/unitReadinessPolicy';
import { teaches } from '../data/contentBundlePolicy';
import { curriculumEngineFor } from '../data/curriculumEnginePolicy';

dotenv.config();

const FREEZE_DAYS = [30, 60];
const EXPECTED_READY = 176;
const ARTIFACT_DIR = path.join(__dirname, '..', 'tests', 'fixtures', 'phase21');

/** Failures that make a plan unusable, as opposed to ones that make it badly sequenced. */
const HARD = new Set(['LENGTH', 'DUPLICATE', 'BLOCKED', 'PREREQ_ORDER', 'PREREQ_UNMET', 'UNSUITABLE',
  'VERIFIED_REINSTRUCTED', 'OUTSIDE_DIRECTION', 'UNKNOWN_UNIT', 'NONDETERMINISTIC']);

/** An issue's identity for comparison: its code and the unit it names, never the day number. */
const issueKey = (i: Issue) => `${i.code}:${i.detail.split(/[\s:]/)[0]}`;

const line = (n = 100) => console.log('-'.repeat(n));
const pad = (s: any, n: number) => String(s).padEnd(n);
const num = (s: any, n: number) => String(s).padStart(n);
const title = (s: string) => { console.log(''); line(); console.log(`  ${s}`); line(); };

(async () => {
  const tenantId = process.argv[2];
  const writeArtifacts = process.argv.includes('--write-artifacts');
  const verbose = process.argv.includes('--verbose');
  if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId)) {
    console.error('Usage: auditProductionComposerReadiness.ts <tenantId> [--write-artifacts] [--verbose]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  const db = mongoose.connection.db!;
  const tenantOid = new mongoose.Types.ObjectId(tenantId);
  const TID = { $in: [tenantId, tenantOid] };
  /** A defect in the composer, the curriculum or the content. Blocks. */
  const defects: string[] = [];
  /** A publish set that would make things worse than READY. Blocks. */
  const setFailures: string[] = [];
  const notes: string[] = [];

  /* ══ DATABASE FINGERPRINT (before) ═══════════════════════════════════════════════════════ */

  const fingerprint = async () => {
    const units = await db.collection('curriculumlearningunits')
      .find({ tenantId: TID }).project({ unitCode: 1, status: 1, suitableStates: 1, updatedAt: 1 })
      .sort({ unitCode: 1 }).toArray();
    const hash = crypto.createHash('md5')
      .update(JSON.stringify(units.map(u => [u.unitCode, u.status, u.suitableStates || null, String(u.updatedAt || '')])))
      .digest('hex');
    const counts: Record<string, number> = {};
    for (const c of ['curriculumlearningunits', 'learningcurriculums', 'dayplans', 'curriculumenrollments',
      'studentcurriculumassignments', 'passportconfigs', 'quizzes', 'questions', 'assignments',
      'skillevidences', 'learningcontentlibraries', 'quizattempts', 'submissions', 'users']) {
      counts[c] = await db.collection(c).countDocuments({});
    }
    return {
      units: units.length,
      published: units.filter(u => u.status === 'PUBLISHED').length,
      archived: units.filter(u => u.status === 'ARCHIVED').length,
      journeys: await db.collection('learningcurriculums').countDocuments({ journeyKind: { $exists: true, $ne: null } }),
      unitStatusHash: hash,
      counts,
    };
  };
  const before = await fingerprint();

  /* ══ 1. PRODUCTION CANDIDATES ════════════════════════════════════════════════════════════ */

  const readySet = await loadCandidates(tenantId, 'PROTOTYPE_UNPUBLISHED');
  const production = await loadCandidates(tenantId, 'PRODUCTION');
  const universe: ComposableUnit[] = [...readySet.units].sort((a, b) => a.unitCode.localeCompare(b.unitCode));
  const byCode = new Map(universe.map(u => [u.unitCode, u]));
  const readyCodes = universe.map(u => u.unitCode);

  const library = await db.collection('learningcontentlibraries')
    .find({ tenantId: TID, unitCode: { $exists: true, $ne: '' } })
    .project({ unitCode: 1, type: 1, isPublished: 1, practiceQuestions: 1 }).toArray();
  const ownByUnit = new Map<string, any[]>();
  for (const r of library) ownByUnit.set(String(r.unitCode), [...(ownByUnit.get(String(r.unitCode)) || []), r]);

  const rejectedBy = (pred: (r: any) => boolean) => readySet.rejected.filter(pred).length;

  const typeTally = (list: ComposableUnit[]) => {
    const t: Record<string, number> = {};
    for (const u of list) t[u.unitType] = (t[u.unitType] || 0) + 1;
    return Object.entries(t).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  ');
  };
  const roleTally = (list: ComposableUnit[]) => {
    const t: Record<string, number> = {};
    for (const u of list) t[compositionRoleOf(u)] = (t[compositionRoleOf(u)] || 0) + 1;
    return Object.entries(t).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  ');
  };

  title('1. PRODUCTION CANDIDATES — readiness recomputed from the database');
  console.log(`    READY (evaluated now, any status but ARCHIVED)   ${universe.length}`);
  console.log(`    PARTIAL                                           ${rejectedBy(r => r.readiness === 'PARTIAL')}`);
  console.log(`    EMPTY / TEACHABLE / ASSESSABLE                    ${rejectedBy(r => r.readiness === 'EMPTY')}`
    + ` / ${rejectedBy(r => r.readiness === 'TEACHABLE')} / ${rejectedBy(r => r.readiness === 'ASSESSABLE')}`);
  console.log(`    ARCHIVED                                          ${before.archived}`);
  const inheritedOnlyReady = universe.filter(u => u.unitType !== 'CHECKPOINT'
    && !(ownByUnit.get(u.unitCode) || []).filter(r => r.isPublished).length);
  console.log(`    READY units owning no published row (non-checkpoint)  ${inheritedOnlyReady.length}`);
  console.log(`    by type   ${typeTally(universe)}`);
  console.log(`    by role   ${roleTally(universe)}`);
  if (universe.length !== EXPECTED_READY) defects.push(`READY is ${universe.length}, expected ${EXPECTED_READY}`);
  if (inheritedOnlyReady.length) defects.push(`READY units with no own content: ${inheritedOnlyReady.map(u => u.unitCode).join(', ')}`);

  /* ══ 2. PHASE-20 RESIDUAL FINDINGS ═══════════════════════════════════════════════════════ */

  const quizzes = await db.collection('quizzes').find({ tenantId: TID, unitCode: { $in: readyCodes } }).toArray();
  const quizByUnit = new Map<string, any[]>();
  for (const q of quizzes) quizByUnit.set(String(q.unitCode), [...(quizByUnit.get(String(q.unitCode)) || []), q]);
  const allQuestionIds = quizzes.flatMap(q => (q.questionIds || []).map(String));
  const questions = await db.collection('questions')
    .find({ _id: { $in: allQuestionIds.filter(i => mongoose.Types.ObjectId.isValid(i)).map(i => new mongoose.Types.ObjectId(i)) } })
    .project({ options: 1 }).toArray();
  const questionById = new Map(questions.map(q => [String(q._id), q]));
  const evidenceRows = await db.collection('skillevidences')
    .find({ tenantId: TID, sourceType: 'question', sourceId: { $in: allQuestionIds } })
    .project({ sourceId: 1, contribution: 1, active: 1 }).toArray();
  const primaryIds = new Set(evidenceRows.filter(r => r.contribution === 'PRIMARY' && r.active).map(r => String(r.sourceId)));

  const tooFew = quizzes.filter(q => (q.questionIds || []).length < 3);
  const unmapped = quizzes.filter(q => (q.questionIds || []).length
    && (q.questionIds || []).every((i: any) => !primaryIds.has(String(i))));
  const unmappedIds = new Set(unmapped.flatMap(q => (q.questionIds || []).map(String)));
  const strayAttribution = evidenceRows.filter(r => unmappedIds.has(String(r.sourceId)));
  const practiceTooFew = universe.filter(u => ['CONCEPT', 'PRACTICE', 'REVIEW'].includes(u.unitType)
    && (ownByUnit.get(u.unitCode) || []).filter(r => String(r.type).startsWith('practice'))
      .reduce((n, r) => n + ((r.practiceQuestions || []) as any[]).length, 0) < 3);

  title('2. PHASE-20 RESIDUAL FINDINGS — recorded, judged on operation');
  const qCounts: Record<number, number> = {};
  for (const q of tooFew) qCounts[(q.questionIds || []).length] = (qCounts[(q.questionIds || []).length] || 0) + 1;
  console.log(`    QUIZ_TOO_FEW       ${num(tooFew.length, 4)}   question counts ${JSON.stringify(qCounts)}`);
  console.log(`    QUIZ_UNMAPPED      ${num(unmapped.length, 4)}   on units: `
    + `${typeTally(unmapped.map(q => byCode.get(String(q.unitCode))!).filter(Boolean))}`);
  console.log(`    PRACTICE_TOO_FEW   ${num(practiceTooFew.length, 4)}   ${practiceTooFew.map(u => u.unitCode).join(', ')}`);
  console.log(`    SkillEvidence rows of ANY contribution on an unmapped quiz's questions: ${strayAttribution.length}`);
  console.log('    quizSkillBridge on an unmapped attempt returns { projected:false, reason:"no skill mappings" },');
  console.log('    records nothing and publishes no MODULE_ASSESSMENT_COMPLETED. The quiz is still graded and still');
  console.log('    gates the day: it assesses learning, it does not produce skill-specific evidence.');
  if (strayAttribution.length) defects.push(`${strayAttribution.length} evidence rows attribute an unmapped quiz question to a skill`);

  /* ══ 3. READY-INVENTORY COMPOSITION ══════════════════════════════════════════════════════ */

  const { allSkills, universalSkills } = skillUniverse(universe);
  const students = REALISTIC_PROFILES.map(p => ({ key: p.key, note: p.note, student: p.build(allSkills, universalSkills) }));

  const certifyPool = (pool: ComposableUnit[]) => students.map(s => {
    const r = compose(pool, s.student);
    return { key: s.key, student: s.student, r, rep: validatePlan({ result: r, universe, student: s.student }) };
  });

  const t0 = Date.now();
  const onReady = certifyPool(universe);
  const composeMs = (Date.now() - t0) / students.length;

  const printProfiles = (label: string, runs: ReturnType<typeof certifyPool>, pool: ComposableUnit[]) => {
    title(label);
    console.log(`    ${pad('profile', 18)}${pad('result', 8)}${pad('sel', 5)}${pad('elig', 6)}${pad('dup', 5)}${pad('block', 7)}`
      + `${pad('det', 5)}${pad('C/P/D/Pj/V', 17)}${pad('1st', 5)}${pad('run', 5)}thirds(inst/prac/dbg/proj/ver)`);
    for (const x of runs) {
      const m = x.rep.metrics;
      const t = m.byType;
      const det = isDeterministic(pool, x.student);
      if (!det) x.rep.issues.push({ code: 'NONDETERMINISTIC', detail: x.key });
      x.rep.ok = x.rep.issues.length === 0;
      const dups = x.r.units.length - new Set(x.r.units.map(u => u.unitCode)).size;
      console.log(`    ${pad(x.key, 18)}${pad(x.rep.ok ? 'PASS' : 'FAIL', 8)}${pad(m.selected, 5)}${pad(m.eligible, 6)}`
        + `${pad(dups, 5)}${pad(x.r.blocked.length, 7)}${pad(det ? 'yes' : 'NO', 5)}`
        + `${pad(`${t.CONCEPT || 0}/${t.PRACTICE || 0}/${t.DEBUG || 0}/${t.PROJECT || 0}/${(t.CHECKPOINT || 0) + (t.REVIEW || 0)}`, 17)}`
        + `${pad(m.firstPracticalDay ?? '-', 5)}${pad(m.maxInstructionalRun, 5)}`
        + m.segments.map(s => `${s.instruction}/${s.practice}/${s.debug}/${s.project}/${s.verify}`).join('  '));
      for (const i of x.rep.issues) console.log(`        ! ${i.code}: ${i.detail}`);
      for (const e of x.rep.explainedShape) {
        console.log(`        ~ explained floor miss ${e.role} ${e.actual}/${e.min} — ${e.candidatesInRole} unit(s) in role, ${e.reason}`);
      }
    }
  };

  printProfiles(`3/5. READY INVENTORY (${universe.length} units) — nine realistic profiles  ·  ~${composeMs.toFixed(0)} ms per composition`, onReady, universe);
  for (const x of onReady) for (const i of x.rep.issues) defects.push(`READY ${x.key}: ${i.code} — ${i.detail}`);

  console.log('\n    role allocation, target(min)/got, per profile:');
  const roles = onReady[0].rep.metrics.allocation.map(a => a.role);
  console.log(`    ${pad('', 18)}${roles.map(r => pad(r.replace(/_INSTRUCTION|_LEARNING|_UNIVERSAL/g, '').slice(0, 11), 13)).join('')}`);
  for (const x of onReady) {
    console.log(`    ${pad(x.key, 18)}${x.rep.metrics.allocation.map(a => pad(`${a.target}(${a.min})/${a.got}`, 13)).join('')}`);
  }

  if (verbose) {
    for (const x of onReady) {
      console.log(`\n    ${x.key} sequence:`);
      console.log('      ' + x.r.units.map((u, i) => `${i + 1}:${u.unitCode.replace(/^T_/, '')}[${u.unitType[0]}]`).join(' '));
    }
  }

  /* ══ 4. STRONG-PROFILE FLOOR ═════════════════════════════════════════════════════════════ */

  title('4. STRONG PROFILES — ADVANCED_UNIVERSAL floor');
  const advanced = universe.filter(u => compositionRoleOf(u) === 'ADVANCED_UNIVERSAL');
  for (const key of ['strong-universal', 'strong-exploring']) {
    const x = onReady.find(o => o.key === key)!;
    const s = x.student;
    const verifiedSkills = [...s.skills.values()].filter(b => (b.score ?? 0) >= 85).length;
    console.log(`    ${key}: shape ${x.r.shape}, ${verifiedSkills} skills measured VERIFIED`);
    const byState = new Map<string, string[]>();
    for (const u of advanced) {
      const k = `${measuredStateOf(u, s)}${isRelevant(u, s) ? '' : ' (outside direction)'}`
        + ` suitable=[${suitableStatesFor(u).join(',')}] ${permanentlyUnsuitable(u, s) ? 'NEVER-SUITABLE' : 'SCHEDULABLE'}`;
      byState.set(k, [...(byState.get(k) || []), u.unitCode]);
    }
    console.log(`      ADVANCED_UNIVERSAL units in READY: ${advanced.length}`);
    for (const [k, codes] of byState) console.log(`        ${num(codes.length, 3)} × ${k}   e.g. ${codes.slice(0, 3).join(', ')}`);
    const adv = x.rep.metrics.allocation.find(a => a.role === 'ADVANCED_UNIVERSAL')!;
    console.log(`      target ${adv.target} (floor ${adv.min}), got ${adv.got}`);
    console.log(`      composer reallocation records: ${x.r.reallocations.length
      ? x.r.reallocations.map(m => `${m.from} -> ${m.to} ${m.units}`).join('; ') : 'none (the floor pass and prerequisite pulls absorbed the budget)'}`);
    const over = x.rep.metrics.allocation.filter(a => a.got > a.target).map(a => `${a.role} +${a.got - a.target}`);
    const under = x.rep.metrics.allocation.filter(a => a.got < a.target).map(a => `${a.role} -${a.target - a.got}`);
    console.log(`      ended above target: ${over.join(', ') || 'none'}`);
    console.log(`      ended below target: ${under.join(', ') || 'none'}`);
    const reinstruct = x.rep.issues.filter(i => i.code === 'VERIFIED_REINSTRUCTED').length;
    const weak = x.r.units.filter(u => u.state === 'VERIFIED' && u.reason === 'DIAGNOSTIC_GAP').length;
    console.log(`      verified skill re-taught: ${reinstruct}   verified skill explained as a gap: ${weak}`
      + `   MASTERY_VERIFIED units: ${x.r.units.filter(u => u.reason === 'MASTERY_VERIFIED').length}`);
    const explained = x.rep.explainedShape.some(e => e.role === 'ADVANCED_UNIVERSAL');
    const unexplained = x.rep.issues.some(i => i.code === 'SHAPE_UNEXPLAINED');
    console.log(`      verdict: ${explained && !unexplained ? 'STRUCTURAL REALLOCATION — every candidate unsuitable at an evidence-only state'
      : unexplained ? 'GENUINE DEFECT' : 'floor met'}`);
    if (weak) defects.push(`${key}: ${weak} verified skill(s) explained as a diagnostic gap`);
  }

  /* ══ 6. DIRECTION ════════════════════════════════════════════════════════════════════════ */

  title('6. DIRECTION CERTIFICATION on READY');
  const dirUnits = universe.filter(u => (u.applicableDirections || []).length);
  const familyInventory: Record<string, number> = {};
  for (const u of dirUnits) {
    const f = [...u.applicableDirections].map(String).sort()[0];
    familyInventory[f] = (familyInventory[f] || 0) + 1;
  }
  console.log(`    direction-scoped READY units by family: ${JSON.stringify(familyInventory)}`);
  console.log(`    READY units scoped to SOFTWARE_BACKEND: ${dirUnits.filter(u => u.applicableDirections.includes('SOFTWARE_BACKEND')).length}`
    + '  (by design — the software core is UNIVERSAL, no direction copies exist)');
  console.log(`    duplicate unit codes in READY: ${readyCodes.length - new Set(readyCodes).size}`);

  for (const x of onReady) {
    const s = x.student;
    const mix = directionFamilyMix(x.r, universe, s);
    const outside = x.rep.issues.filter(i => i.code === 'OUTSIDE_DIRECTION').length;
    console.log(`    ${pad(x.key, 18)}${pad(`${s.directionStatus}${s.primaryDirection ? ' ' + s.primaryDirection : ''}`, 30)}`
      + `direction units ${num(x.r.composition.DIRECTION_LEARNING || 0, 2)}  families ${JSON.stringify(mix)}  outside-direction ${outside}`);
  }

  const sw = onReady.find(o => o.key === 'software_backend')!;
  const swNoAff = compose(withoutCoreAffinity(universe), sw.student);
  const withUse = coreModuleUse(sw.r, universe, sw.student);
  const withoutUse = coreModuleUse(swNoAff, universe, sw.student);
  const corePractical = universe.filter(u => ['PRACTICE', 'DEBUG', 'PROJECT'].includes(u.unitType)
    && isCoreModuleFor(u.moduleCode, 'SOFTWARE_BACKEND'));
  const planCodes = new Set(sw.r.units.map(u => u.unitCode));
  console.log('\n    SOFTWARE_BACKEND shared-core affinity (Programming, C, DSA, Databases, Developer Tools)');
  console.log(`      core-module PRACTICE/DEBUG/PROJECT units in READY: ${corePractical.length}; in this plan: `
    + `${corePractical.filter(u => planCodes.has(u.unitCode)).length}; not in it: `
    + `${corePractical.filter(u => !planCodes.has(u.unitCode)).map(u => `${u.unitCode}(${measuredStateOf(u, sw.student)})`).join(', ') || 'none'}`);
  console.log(`      with affinity:    practical ${withUse.practicalTotal}, from core ${withUse.practicalFromCore};  instruction from core ${withUse.instructionFromCore}`);
  console.log(`      affinity removed: practical ${withoutUse.practicalTotal}, from core ${withoutUse.practicalFromCore};  instruction from core ${withoutUse.instructionFromCore}`);
  const sameOrder = sw.r.units.map(u => u.unitCode).join('|') === swNoAff.units.map(u => u.unitCode).join('|');
  console.log(`      plans identical with and without affinity: ${sameOrder ? 'yes — the core practical inventory is already exhausted, so there is nothing for it to reorder' : 'no'}`);
  const swInvariant = sw.rep.issues.filter(i => HARD.has(i.code));
  console.log(`      hard invariant issues with affinity (suitability, prerequisites, re-instruction, duplicates): ${swInvariant.length}`);
  if (swInvariant.length) defects.push(`SOFTWARE_BACKEND affinity broke an invariant: ${swInvariant.map(i => i.code).join(', ')}`);
  if (withUse.practicalFromCore < withoutUse.practicalFromCore) defects.push('SOFTWARE_BACKEND affinity reduced core practical work');

  console.log('\n    undecided breadth');
  for (const key of ['undecided', 'strong-universal', 'strong-exploring', 'beginner', 'mixed']) {
    const x = onReady.find(o => o.key === key)!;
    const mix = directionFamilyMix(x.r, universe, x.student);
    const total = Object.values(mix).reduce((a, b) => a + b, 0);
    const top = Math.max(0, ...Object.values(mix));
    const again = directionFamilyMix(compose([...universe].reverse(), x.student), universe, x.student);
    const det = JSON.stringify(mix) === JSON.stringify(again);
    const ok = det && (Object.keys(mix).length < 2 || top / Math.max(1, total) <= 0.7);
    console.log(`      ${pad(key, 18)}${pad(JSON.stringify(mix), 52)} largest ${total ? ((top / total) * 100).toFixed(0) : 0}%  deterministic ${det ? 'yes' : 'NO'}  ${ok ? 'ok' : 'FAIL'}`);
    if (!ok) defects.push(`breadth: ${key} ${JSON.stringify(mix)}`);
  }

  /* ══ scenarios on READY (used by 7, 8 and 9) ═════════════════════════════════════════════ */

  const recompositions = (pool: ComposableUnit[]) => students.flatMap(s => FREEZE_DAYS.flatMap(freezeDay =>
    EVOLUTIONS.map(kind => ({ key: `${s.key}/${kind}@${freezeDay}`, rep: simulateRecomposition({ pool, universe, base: s.student, kind, freezeDay }) }))));

  const grid = robustnessGrid(allSkills, universalSkills);
  const sweep = (pool: ComposableUnit[]) => grid.map(g => {
    const r = compose(pool, g.student);
    const rep = validatePlan({ result: r, universe, student: g.student });
    return { key: g.key, r, rep, hardOk: !rep.issues.some(i => HARD.has(i.code)), keys: new Set(rep.issues.map(issueKey)) };
  });

  const recompReady = recompositions(universe);
  const sweepReady = sweep(universe);

  /* ══ 7. CHECKPOINT / PROJECT ═════════════════════════════════════════════════════════════ */

  title('7. CHECKPOINT / REVIEW / PROJECT CERTIFICATION');
  const selectedAnywhere = new Map<string, number>();
  const noteSel = (codes: string[]) => { for (const c of codes) selectedAnywhere.set(c, (selectedAnywhere.get(c) || 0) + 1); };
  onReady.forEach(x => noteSel(x.r.units.map(u => u.unitCode)));
  recompReady.forEach(x => noteSel(x.rep.freshCodes));
  sweepReady.filter(x => x.hardOk).forEach(x => noteSel(x.r.units.map(u => u.unitCode)));

  const verifyUnits = universe.filter(u => u.unitType === 'CHECKPOINT' || u.unitType === 'REVIEW');
  const projectUnits = universe.filter(u => u.unitType === 'PROJECT');
  const assignments = await db.collection('assignments')
    .find({ tenant: tenantOid, unitCode: { $in: projectUnits.map(u => u.unitCode) } }).toArray();

  const positionsIn = (code: string) => onReady
    .map(x => { const i = x.r.units.findIndex(u => u.unitCode === code); return i >= 0 ? `${x.key}@${i + 1}` : ''; })
    .filter(Boolean);

  const quizCheck = (code: string) => {
    const qs = quizByUnit.get(code) || [];
    const problems: string[] = [];
    let mapped = 0; let total = 0;
    for (const q of qs) {
      const ids = (q.questionIds || []).map(String);
      total += ids.length;
      if (!ids.length) problems.push('no questions');
      const missing = ids.filter((i: string) => !questionById.has(i));
      if (missing.length) problems.push(`${missing.length} questionIds resolve to nothing`);
      const badKey = ids.filter((i: string) => questionById.has(i)
        && ((questionById.get(i)!.options || []) as any[]).filter(o => o.isCorrect).length !== 1);
      if (badKey.length) problems.push(`${badKey.length} questions without exactly one correct option`);
      if (q.totalQuestions !== ids.length) problems.push(`totalQuestions ${q.totalQuestions} != ${ids.length}`);
      if (!(q.totalTime > 0)) problems.push('no totalTime');
      if (q.isActive === false) problems.push('inactive');
      if (q.access === 'private') problems.push('private');
      if (q.accessibleTo && q.accessibleTo !== 'everyone') problems.push(`accessibleTo ${q.accessibleTo}`);
      if (q.archivedAt) problems.push('archived');
      mapped += ids.filter((i: string) => primaryIds.has(i)).length;
    }
    return { problems, mapped, total, count: qs.length };
  };

  const taughtBy = (skill: string, self: string) => universe.some(x => x.unitCode !== self
    && ['CONCEPT', 'WORKED_EXAMPLE', 'PRACTICE'].includes(x.unitType) && x.skillKeys.includes(skill));

  let certFailures = 0;
  console.log(`    ${pad('unit', 36)}${pad('type', 11)}${pad('bound', 24)}${pad('evidence', 13)}${pad('gate', 30)}reached`);
  for (const u of [...verifyUnits, ...projectUnits]) {
    const prereqsReady = u.prerequisiteUnitCodes.every(p => byCode.has(p));
    const reached = selectedAnywhere.get(u.unitCode) || 0;
    let bound = '';
    let evidence = '';
    const problems: string[] = [];
    if (u.unitType === 'PROJECT') {
      const as = assignments.filter(a => a.unitCode === u.unitCode);
      if (as.length !== 1) problems.push(`${as.length} assignments`);
      for (const a of as) {
        const rubric = (a.rubric || []) as any[];
        const sum = rubric.reduce((n, r) => n + (r.maxPoints || 0), 0);
        if (String(a.type).toLowerCase() !== 'project') problems.push(`type ${a.type}`);
        if (!rubric.length || sum !== a.totalPoints) problems.push(`rubric ${sum} vs ${a.totalPoints}`);
        if (String(a.instructions || '').length < 400) problems.push('thin brief');
        if (a.status === 'archived') problems.push('archived');
        bound = `assignment ${a.status || 'draft'} ${rubric.length}crit ${a.totalPoints}pt`;
      }
      evidence = 'rubric';
    } else {
      const qc = quizCheck(u.unitCode);
      if (u.unitType === 'CHECKPOINT' && qc.count !== 1) problems.push(`${qc.count} bound quizzes`);
      problems.push(...qc.problems);
      bound = qc.count ? `quiz ${qc.total}q` : 'own recap (no quiz)';
      evidence = qc.count ? `${qc.mapped}/${qc.total} mapped` : '-';
    }
    const untaught = u.unitType === 'PROJECT' ? [] : u.skillKeys.filter(k => !taughtBy(k, u.unitCode));
    const gate = u.prerequisiteUnitCodes.length ? `after ${u.prerequisiteUnitCodes.join(',').replace(/T_/g, '')}` : 'NO PREREQUISITE';
    if (!prereqsReady) problems.push('a prerequisite is not READY');
    if (!reached) problems.push('never reached in any scenario the READY inventory serves');
    if (problems.length) certFailures++;
    console.log(`    ${pad(u.unitCode, 36)}${pad(u.unitType, 11)}${pad(bound, 24)}${pad(evidence, 13)}${pad(gate.slice(0, 29), 30)}`
      + `${num(reached, 3)}  ${positionsIn(u.unitCode).slice(0, 5).join(' ')}`
      + `${untaught.length ? `   skills no READY unit teaches: ${untaught.join(',')}` : ''}${problems.length ? `   ! ${problems.join('; ')}` : ''}`);
  }
  if (certFailures) defects.push(`${certFailures} checkpoint/review/project unit(s) failed operational certification`);

  const ungated = verifyUnits.filter(u => !u.prerequisiteUnitCodes.length);
  for (const u of ungated) {
    notes.push(`${u.unitCode} declares no prerequisite and measures skills no READY unit teaches — its placement is decided by suitability alone`);
  }

  const allQuizProblems = readyCodes.map(c => ({ c, p: (quizByUnit.get(c) || []).length ? quizCheck(c).problems : [] }))
    .filter(x => x.p.length);
  console.log(`\n    every bound quiz on a READY unit (${quizzes.length}): operational problems on ${allQuizProblems.length}`);
  for (const x of allQuizProblems.slice(0, 5)) console.log(`      ${x.c}: ${x.p.join('; ')}`);
  if (allQuizProblems.length) defects.push(`${allQuizProblems.length} bound quizzes are not operational`);

  const maxVerification = Math.max(...onReady.map(x => x.rep.metrics.allocation.find(a => a.role === 'VERIFICATION')!.got));
  console.log(`    VERIFICATION inventory ${verifyUnits.length}; the most any realistic profile uses ${maxVerification} (ESTABLISHED target 8)`);
  console.log('    delivery: a quiz or assignment inside an active journey DayPlan resolves as source "curriculum",');
  console.log('    which bypasses the Assignment DRAFT status and the quiz\'s own date window by design.');
  console.log('    caveat: recomposeFutureDays writes items:[] on rewritten days and nothing refills them, so a');
  console.log('    recomposed project day would lose that curriculum link. Not reachable today (no route calls it).');

  /* ══ 8. PUBLISH SETS ═════════════════════════════════════════════════════════════════════ */

  const poolOf = (codes: Set<string>) => universe.filter(u => codes.has(u.unitCode));
  const isClosed = (codes: Set<string>) =>
    [...codes].every(c => byCode.get(c)!.prerequisiteUnitCodes.every(p => !byCode.has(p) || codes.has(p)));

  /** READY's own issues per profile. A subset may match these; it may not add to them. */
  const readyKeys = new Map(onReady.map(x => [x.key, new Set(x.rep.issues.map(issueKey))]));
  const noWorse = (runs: ReturnType<typeof certifyPool>) => runs.every(x =>
    x.r.units.length === PROGRAM_DAYS && x.rep.issues.every(i => readyKeys.get(x.key)!.has(issueKey(i))));
  const allNoWorse = (codes: Set<string>) => noWorse(certifyPool(poolOf(codes)));

  const usage = new Map<string, number>();
  onReady.forEach(x => x.r.units.forEach(u => usage.set(u.unitCode, (usage.get(u.unitCode) || 0) + 1)));

  title('8. PUBLISH SETS');
  const tSearch = Date.now();
  let minimum = prerequisiteClosure(usage.keys(), universe);
  const unionPasses = allNoWorse(minimum);
  console.log(`    union of the nine READY compositions, prerequisite-closed: ${minimum.size}  (no worse than READY: ${unionPasses ? 'yes' : 'no'})`);
  if (!unionPasses) minimum = new Set(readyCodes);

  for (let i = 0; i < 5; i++) {
    const shrunk = prerequisiteClosure(certifyPool(poolOf(minimum)).flatMap(x => x.r.units.map(u => u.unitCode)), universe);
    if (shrunk.size < minimum.size && allNoWorse(shrunk)) minimum = shrunk; else break;
  }
  let changed = true;
  let passes = 0;
  while (changed && passes++ < 4) {
    changed = false;
    const order = [...minimum].sort((a, b) => (usage.get(a) || 0) - (usage.get(b) || 0) || a.localeCompare(b));
    for (const code of order) {
      if ([...minimum].some(c => byCode.get(c)!.prerequisiteUnitCodes.includes(code))) continue;
      const trial = new Set(minimum);
      trial.delete(code);
      if (allNoWorse(trial)) { minimum = trial; changed = true; }
    }
  }
  console.log(`    ABSOLUTE MINIMUM: ${minimum.size}   locally minimal, prerequisite-closed ${isClosed(minimum) ? 'yes' : 'NO'},`
    + ` searched in ${((Date.now() - tSearch) / 1000).toFixed(0)}s`);
  console.log(`      ${typeTally(poolOf(minimum))}`);

  const union = new Set<string>();
  onReady.forEach(x => x.r.units.forEach(u => union.add(u.unitCode)));
  recompReady.filter(x => x.rep.ok).forEach(x => x.rep.freshCodes.forEach(c => union.add(c)));
  sweepReady.filter(x => x.hardOk).forEach(x => x.r.units.forEach(u => union.add(u.unitCode)));
  for (const u of [...verifyUnits, ...projectUnits]) union.add(u.unitCode);
  const recommended = prerequisiteClosure(union, universe);
  const excluded = readyCodes.filter(c => !recommended.has(c));

  console.log(`    RECOMMENDED SAFE SET: ${recommended.size}   prerequisite-closed ${isClosed(recommended) ? 'yes' : 'NO'}`);
  console.log(`      ${typeTally(poolOf(recommended))}`);
  console.log(`      withheld from READY: ${excluded.length}${excluded.length ? ' — never selected by any profile, recomposition or sweep cell READY serves' : ''}`);
  for (const c of excluded) {
    const u = byCode.get(c)!;
    console.log(`        ${pad(c, 36)}${pad(u.unitType, 11)}${pad(compositionRoleOf(u), 24)}${u.category}`
      + `${u.applicableDirections.length ? ' [' + u.applicableDirections.join(',') + ']' : ''}`);
  }

  /* ══ 9. SIMULATE THE PUBLISH SETS ════════════════════════════════════════════════════════ */

  const recPool = poolOf(recommended);
  const minPool = poolOf(minimum);
  const onRec = certifyPool(recPool);
  printProfiles(`9a. RECOMMENDED SET (${recommended.size}) — nine realistic profiles as an isolated pool`, onRec, recPool);
  const onMin = certifyPool(minPool);
  printProfiles(`9b. ABSOLUTE MINIMUM (${minimum.size}) — nine realistic profiles as an isolated pool`, onMin, minPool);
  if (!noWorse(onRec)) setFailures.push('RECOMMENDED gives at least one profile a worse plan than READY');
  for (const x of onRec) if (x.r.units.length !== PROGRAM_DAYS) setFailures.push(`RECOMMENDED ${x.key}: ${x.r.units.length} units`);

  const recompRec = recompositions(recPool);
  const recompMin = recompositions(minPool);
  title('9c. FUTURE RECOMPOSITION — frozen at day 30 and day 60; improvement, struggle, newly verified, direction refined');
  const summarise = (label: string, reps: { key: string; rep: RecompositionReport }[]) => {
    const slack = reps.map(x => x.rep.slack).sort((a, b) => a - b);
    console.log(`    ${pad(label, 14)}${num(reps.filter(x => x.rep.ok).length, 3)}/${reps.length} hold 90 valid days   future slack min ${slack[0]}`
      + `  median ${slack[Math.floor(slack.length / 2)]}   fresh composition below 90 in ${reps.filter(x => !x.rep.freshOk).length}`);
  };
  summarise('READY', recompReady);
  summarise('RECOMMENDED', recompRec);
  summarise('MINIMUM', recompMin);
  console.log(`\n    ${pad('scenario', 40)}${pad('READY', 20)}${pad('RECOMMENDED', 20)}MINIMUM`);
  for (let i = 0; i < recompReady.length; i++) {
    const cell = (x: { rep: RecompositionReport }) => `${x.rep.ok ? 'ok' : 'FAIL'} s${x.rep.slack} f${x.rep.freshSelected}`;
    const interesting = !recompReady[i].rep.ok || !recompRec[i].rep.ok || !recompMin[i].rep.ok
      || !recompReady[i].rep.freshOk || !recompMin[i].rep.freshOk || recompMin[i].rep.slack < 3;
    if (!interesting && !verbose) continue;
    console.log(`    ${pad(recompReady[i].key, 40)}${pad(cell(recompReady[i]), 20)}${pad(cell(recompRec[i]), 20)}${cell(recompMin[i])}`
      + `  ${[...recompReady[i].rep.issues, ...recompRec[i].rep.issues, ...recompMin[i].rep.issues].slice(0, 2).map(x => `${x.code}:${x.detail}`).join(' | ')}`);
  }
  console.log('    (s = future candidates beyond the slots to fill, f = units in the fresh composition;');
  console.log('     only failures, short fresh compositions and minimum slack under 3 are listed)');
  for (let i = 0; i < recompReady.length; i++) {
    if (!recompReady[i].rep.ok) defects.push(`READY recomposition ${recompReady[i].key}: ${recompReady[i].rep.issues.map(x => x.code).join(', ')}`);
    else if (!recompRec[i].rep.ok) setFailures.push(`RECOMMENDED recomposition ${recompRec[i].key}: ${recompRec[i].rep.issues.map(x => x.code).join(', ')}`);
  }
  const minRecompLost = recompReady.filter((x, i) => x.rep.ok && !recompMin[i].rep.ok).map(x => x.key);

  title('9d. LEARNER-STATE SWEEP — 288 cells, coverage x score x direction stance');
  const sweepRec = sweep(recPool);
  const sweepMin = sweep(minPool);
  const lost = (subset: ReturnType<typeof sweep>) => subset.filter((x, i) => {
    const r = sweepReady[i];
    return (r.hardOk && !x.hardOk) || [...x.keys].some(k => !r.keys.has(k));
  }).map(x => x.key);
  const lostRec = lost(sweepRec);
  const lostMin = lost(sweepMin);
  const hardReady = sweepReady.filter(x => x.hardOk);
  console.log(`    ${pad('', 14)}${pad('usable plan', 14)}${pad('fully clean', 14)}cells worse than READY`);
  console.log(`    ${pad('READY', 14)}${pad(`${hardReady.length}/${grid.length}`, 14)}${pad(`${sweepReady.filter(x => x.rep.ok).length}/${grid.length}`, 14)}-`);
  console.log(`    ${pad('RECOMMENDED', 14)}${pad(`${sweepRec.filter(x => x.hardOk).length}/${grid.length}`, 14)}${pad(`${sweepRec.filter(x => x.rep.ok).length}/${grid.length}`, 14)}${lostRec.length}`);
  console.log(`    ${pad('MINIMUM', 14)}${pad(`${sweepMin.filter(x => x.hardOk).length}/${grid.length}`, 14)}${pad(`${sweepMin.filter(x => x.rep.ok).length}/${grid.length}`, 14)}${lostMin.length}`);
  if (lostMin.length) console.log(`      minimum is worse in e.g. ${lostMin.slice(0, 8).join(', ')}`);

  const tally = (list: string[]) => {
    const m = new Map<string, number>();
    for (const k of list) m.set(k, (m.get(k) || 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}=${v}`).join('  ');
  };
  console.log(`\n    READY cells with no usable plan: ${grid.length - hardReady.length}`);
  console.log(`      by coverage@score: ${tally(sweepReady.filter(x => !x.hardOk).map(x => x.key.split('/')[0]))}`);
  console.log(`      by issue:          ${tally(sweepReady.filter(x => !x.hardOk).flatMap(x => [...new Set(x.rep.issues.filter(i => HARD.has(i.code)).map(i => i.code))]))}`);
  console.log(`    READY cells usable but with sequencing/shape findings: ${hardReady.filter(x => !x.rep.ok).length}`);
  console.log(`      by issue:          ${tally(hardReady.flatMap(x => [...new Set(x.rep.issues.map(i => i.code))]))}`);
  console.log('    A cell READY cannot serve is a learner state beyond this inventory, not a publish-set question.');
  if (lostRec.length) setFailures.push(`RECOMMENDED is worse than READY in ${lostRec.length} sweep cells: ${lostRec.slice(0, 5).join(', ')}`);

  console.log('\n    eligible units beyond 90, per profile:');
  console.log(`    ${pad('', 18)}${pad('READY', 8)}${pad('RECOMM', 8)}MINIMUM`);
  for (let i = 0; i < students.length; i++) {
    console.log(`    ${pad(students[i].key, 18)}${pad(onReady[i].rep.metrics.slack, 8)}${pad(onRec[i].rep.metrics.slack, 8)}${onMin[i].rep.metrics.slack}`);
  }
  console.log(`\n    minimum loses ${minRecompLost.length} recomposition scenario(s) and ${lostMin.length} sweep cell(s) READY serves`
    + ` — ${minRecompLost.length || lostMin.length ? 'NOT production-safe' : 'no measured loss'}`);

  /* ══ 10. PRODUCTION REALITY ══════════════════════════════════════════════════════════════ */

  title('10. CURRENT ACTUAL PRODUCTION SOURCE');
  const beginner: StudentProfile = students[0].student;
  const prodJourney = await composeFoundationJourney(tenantId, beginner);
  const configs = await db.collection('passportconfigs').find({}).toArray();
  const engine = configs.map(c => curriculumEngineFor({ config: c as any, stageKey: 'foundation' })).includes('UNIT') ? 'UNIT' : 'TOPIC';
  console.log(`    PUBLISHED units                    ${before.published}`);
  console.log(`    COMPOSER_ELIGIBLE (PRODUCTION)     ${production.units.length}`);
  console.log(`    composeFoundationJourney(PRODUCTION, beginner): ok=${prodJourney.composition.ok} `
    + `candidates=${prodJourney.candidates} selected=${prodJourney.composition.units.length} code=${prodJourney.composition.code || '-'}`);
  console.log(`    curriculum engine                  ${engine}  (${configs.length} PassportConfig document(s))`);
  console.log('    Production composition refuses by design while nothing is published.');

  /* ══ PUBLICATION REQUIRED ════════════════════════════════════════════════════════════════ */

  title('PUBLICATION THAT WOULD BE REQUIRED (not executed)');
  const unitDocs = await db.collection('curriculumlearningunits')
    .find({ tenantId: TID, unitCode: { $in: [...recommended] } }).project({ unitCode: 1, status: 1, unitType: 1 }).toArray();
  const gateProblems: string[] = [];
  for (const d of unitDocs) {
    if (d.status !== 'DRAFT') gateProblems.push(`${d.unitCode} is ${d.status}`);
    if (typeRequiresTeaching(d.unitType) && !(ownByUnit.get(d.unitCode) || []).some(r => r.isPublished && teaches(String(r.type)))) {
      gateProblems.push(`${d.unitCode} has no own teaching row; the publish route would refuse it`);
    }
  }
  console.log(`    ${recommended.size} × POST /api/v1/careerpilot/curriculum-units/:unitCode/publish`);
  console.log('    (legacy alias /api/v1/passport/...; passportRoutes -> curriculumLearningUnitController.publishUnit)');
  console.log('    by a MANAGE-authorised admin of this tenant. Each call re-evaluates readiness, requires the type\'s own');
  console.log('    teaching where the type needs it, and sets status DRAFT -> PUBLISHED. Bound Quiz and Assignment rows need');
  console.log('    no status change: a journey day delivers them as curriculum content.');
  console.log(`    publish-gate pre-check over the recommended set: ${gateProblems.length ? `${gateProblems.length} problem(s)` : 'every unit would pass'}`);
  for (const p of gateProblems.slice(0, 5)) console.log(`      ! ${p}`);
  if (gateProblems.length) setFailures.push(`${gateProblems.length} recommended units would be refused by the publish route`);

  /* ══ ARTIFACTS ═══════════════════════════════════════════════════════════════════════════ */

  if (writeArtifacts) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'ready-inventory.json'), `${JSON.stringify(universe, null, 2)}\n`);
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'publish-sets.json'), `${JSON.stringify({
      description: 'Phase 21 proposed publish sets. PROPOSED ONLY — nothing here has been published.',
      source: 'auditProductionComposerReadiness.ts against the reconstructed Phase-20 development database',
      readyCount: universe.length,
      absoluteMinimum: [...minimum].sort(),
      recommended: [...recommended].sort(),
      withheldFromRecommended: excluded,
    }, null, 2)}\n`);
    console.log(`\n  artifacts written to ${path.relative(process.cwd(), ARTIFACT_DIR)}`);
  }

  /* ══ 11. DATABASE SAFETY ═════════════════════════════════════════════════════════════════ */

  const after = await fingerprint();
  title('11. DATABASE SAFETY');
  const same = JSON.stringify(before) === JSON.stringify(after);
  console.log(`    units ${after.units}  PUBLISHED ${after.published}  journeys ${after.journeys}  DayPlans ${after.counts.dayplans}`
    + `  enrolments ${after.counts.curriculumenrollments}  engine ${engine}`);
  console.log(`    unit status fingerprint ${after.unitStatusHash}  unchanged: ${before.unitStatusHash === after.unitStatusHash ? 'yes' : 'NO'}`);
  console.log(`    every audited collection count unchanged: ${same ? 'yes' : 'NO'}`);
  if (!same) defects.push('the database changed during a read-only audit');
  if (after.published !== 0 || after.journeys !== 0 || after.counts.dayplans !== 0 || engine !== 'TOPIC') {
    defects.push('exit state is not PUBLISHED=0 / journeys=0 / DayPlans=0 / engine OFF');
  }

  const blocked = defects.length + setFailures.length > 0;
  title(`PHASE 21 READ-ONLY AUDIT: ${blocked ? 'BLOCKED' : 'PASS'}`);
  for (const d of defects) console.log(`    DEFECT      ${d}`);
  for (const f of setFailures) console.log(`    SET         ${f}`);
  for (const n of notes) console.log(`    note        ${n}`);
  console.log('');

  await mongoose.disconnect();
  process.exit(blocked ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });

export type { PlanReport };
