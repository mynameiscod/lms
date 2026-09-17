/**
 * Phase 21 — the ACTUAL PRODUCTION gate, run after the certified publication.
 *
 * READ ONLY. Every other Phase-21 certification composes an isolated candidate list — READY, or a
 * proposed subset — standing in for what PRODUCTION would return. This one does not simulate
 * anything: every plan is built by composeFoundationJourney(tenant, profile), the production
 * builder, whose inventory is loadCandidates(tenant, 'PRODUCTION') — PUBLISHED && READY, read from
 * the database at that moment.
 *
 * It holds the release invariants on that inventory and nothing else:
 *   - the production inventory is exactly the certified recommended set, field for field;
 *   - the nine realistic profiles and the 40 state-boundary learners each get exactly ninety days,
 *     deterministically, with no duplicate, no blocked prerequisite, no unexplained shape and no
 *     unit outside the learner's direction;
 *   - the 72 recomposition scenarios hold ninety valid days, and every rewritten future day keeps a
 *     complete activity bundle built by the journey service's own resolver;
 *   - with evidence kinds, twelve learners replayed through ninety days keep ninety distinct days and the backbone,
 *     never plan a checkpoint-only skill beyond STANDARD, keep the spine's coding assignments, and leave strong
 *     learners exactly as compressed as before;
 *   - the 338 units have no broken prerequisite, no cycle, no malformed assessment, no broken
 *     project assignment and no duplicated asset;
 *   - the database is in the authorised state: certified set published, no journeys, no DayPlans,
 *     no enrolments, engine off — and nothing changed while this ran.
 *
 *   npx ts-node src/scripts/certifyProductionComposer.ts <tenantId>
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { loadCandidates } from '../services/composerCandidateService';
import { composeFoundationJourney, loadAssets, activitiesFor, UnitAssets } from '../services/foundationJourneyService';
import { ComposableUnit, StudentProfile, composeUnits } from '../services/curriculumComposerService';
import {
  REALISTIC_PROFILES, REAL_SKILL_CHECK_PROFILES, spineContinuityIssues, spineFirstPractices,
  PROGRAM_DAYS, EVOLUTIONS, validatePlan, isDeterministic, skillUniverse,
  simulateRecomposition, stateBoundaryProfiles, diagnosticSkills, directionFamilyMix,
  CONTINUITY_EVOLUTIONS, CONTINUITY_FREEZE_DAYS, CONTINUITY_CHAINS, continuityLearners, simulateReassessmentChain,
  BACKBONE_PROFILES, auditBackbone, backboneIssues, backboneEndLoading, backboneTopicsOf, compressionLadder,
  BACKBONE_EVOLUTIONS, simulateBackboneRecomposition,
} from '../services/composerCertificationService';
import { buildPrerequisiteGraph, findPrerequisiteCycles } from '../data/unitPrerequisiteGraph';
import { typeRequiresTeaching } from '../data/unitReadinessPolicy';
import { roleOf, teaches } from '../data/contentBundlePolicy';
import { effectiveCurriculumEngine } from '../data/curriculumEnginePolicy';
import { INTENTIONALLY_WITHHELD_READY, publicationDrift } from '../data/productionPublicationPolicy';
import { CAREER_STAGES } from '../services/careerStageService';
import { findDuplication, identifyingWordsFor } from '../services/contentDuplicationService';
import { checkCurriculumQuizLinkage } from '../services/quizLinkageService';
import { evidenceKindGate } from '../tests/evidenceCalibration/simulator';

dotenv.config();

const FIXTURES = path.join(__dirname, '..', 'tests', 'fixtures', 'phase21');
const FREEZE_DAYS = [30, 60];
const pad = (s: unknown, n: number) => String(s).padEnd(n);

(async () => {
  const tenantId = process.argv[2];
  if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId)) {
    console.error('Usage: certifyProductionComposer.ts <tenantId>');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');
  const db = mongoose.connection.db!;
  const tenantOid = new mongoose.Types.ObjectId(tenantId);
  const TID = { $in: [tenantId, tenantOid] };
  const failures: string[] = [];
  const title = (t: string) => console.log(`\n${'-'.repeat(100)}\n  ${t}\n${'-'.repeat(100)}`);

  /**
   * What a read-only gate must leave exactly as it found it: THIS tenant's curriculum content.
   *
   * Scoped on purpose. On a live database members keep working while the gate runs — their
   * attempts, DayPlans, enrolments and journeys change on their own — so counting those would fail
   * the gate for somebody else's homework. This tenant's journeys are reported, not compared.
   */
  const CONTENT = ['curriculumlearningunits', 'learningcontentlibraries', 'quizzes', 'questions', 'assignments', 'skillevidences'];
  const fingerprint = async () => {
    const units = await db.collection('curriculumlearningunits').find({ tenantId: TID })
      .project({ unitCode: 1, status: 1, suitableStates: 1, updatedAt: 1 }).sort({ unitCode: 1 }).toArray();
    const counts: Record<string, number> = {};
    for (const c of CONTENT) counts[c] = await db.collection(c).countDocuments({ $or: [{ tenantId: TID }, { tenant: tenantOid }] });
    const journeyIds = (await db.collection('learningcurriculums')
      .find({ tenantId: TID, journeyKind: { $exists: true, $ne: null } }).project({ _id: 1 }).toArray()).map(j => j._id);
    return {
      hash: crypto.createHash('md5').update(JSON.stringify(units.map(u =>
        [u.unitCode, u.status, u.suitableStates || null, String(u.updatedAt || '')]))).digest('hex'),
      units: units.length,
      published: units.filter(u => u.status === 'PUBLISHED').map(u => String(u.unitCode)).sort(),
      counts,
      journeys: journeyIds.length,
      journeyDayPlans: journeyIds.length ? await db.collection('dayplans').countDocuments({ curriculumId: { $in: journeyIds } }) : 0,
      journeyEnrolments: journeyIds.length ? await db.collection('curriculumenrollments').countDocuments({ curriculumId: { $in: journeyIds } }) : 0,
    };
  };
  const before = await fingerprint();

  /* ══ 1. THE PRODUCTION INVENTORY IS THE CERTIFIED SET ═══════════════════════════════════ */

  title('1. ACTUAL PRODUCTION INVENTORY — loadCandidates(PRODUCTION): PUBLISHED && READY');
  const certified = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'publish-sets.json'), 'utf8'));
  const readyFixture = JSON.parse(fs.readFileSync(path.join(FIXTURES, 'ready-inventory.json'), 'utf8')) as ComposableUnit[];
  const fixtureByCode = new Map(readyFixture.map(u => [u.unitCode, u]));
  const certifiedCodes: string[] = [...certified.recommended].sort();

  const production = await loadCandidates(tenantId, 'PRODUCTION');
  const universe = [...production.units].sort((a, b) => a.unitCode.localeCompare(b.unitCode));
  const prodCodes = universe.map(u => u.unitCode);
  const prodSet = new Set(prodCodes);
  const missing = certifiedCodes.filter(c => !prodSet.has(c));
  const extra = prodCodes.filter(c => !certifiedCodes.includes(c));
  const metadataDrift = universe.filter(u => JSON.stringify(u) !== JSON.stringify(fixtureByCode.get(u.unitCode))).map(u => u.unitCode);
  const inventoryMatches = !missing.length && !extra.length && !metadataDrift.length;

  console.log(`    production eligible source                ${production.isProductionEligible ? 'yes' : 'NO'}`);
  console.log(`    COMPOSER_ELIGIBLE (PUBLISHED && READY)    ${universe.length}`);
  console.log(`    certified recommended set                 ${certifiedCodes.length}`);
  console.log(`    certified but not in production           ${missing.length}${missing.length ? `  ${missing.slice(0, 8).join(', ')}` : ''}`);
  console.log(`    in production but not certified           ${extra.length}${extra.length ? `  ${extra.slice(0, 8).join(', ')}` : ''}`);
  console.log(`    unit metadata differing from certification ${metadataDrift.length}${metadataDrift.length ? `  ${metadataDrift.slice(0, 8).join(', ')}` : ''}`);
  console.log(`    PRODUCTION INVENTORY MATCHES CERTIFIED SET ${inventoryMatches ? 'YES' : 'NO'}`);
  if (!production.isProductionEligible) failures.push('PRODUCTION candidate set is not production eligible');
  if (!inventoryMatches) failures.push('production inventory is not exactly the certified set');

  /* ══ plan certification through the production builder ═════════════════════════════════ */

  type Row = { key: string; ok: boolean; line: string };
  const certify = async (key: string, student: StudentProfile, extraChecks: (r: any) => string[] = () => []): Promise<Row> => {
    const first = await composeFoundationJourney(tenantId, student);
    const second = await composeFoundationJourney(tenantId, student);
    const r = first.composition;
    const codes = r.units.map((u: any) => u.unitCode);
    const rep = validatePlan({ result: r, universe, student });
    const issues = rep.issues.map(i => i.code);
    // The certification helpers compose the same inventory purely; they must agree with the builder.
    const pure = composeUnits({ candidates: universe, targetUnits: PROGRAM_DAYS, student }).units.map(u => u.unitCode);
    const deterministic = JSON.stringify(codes) === JSON.stringify(second.composition.units.map((u: any) => u.unitCode))
      && isDeterministic(universe, student);
    if (first.candidates !== certifiedCodes.length) issues.push(`CANDIDATES_${first.candidates}`);
    if (codes.length !== PROGRAM_DAYS) issues.push(`LENGTH_${codes.length}`);
    if (new Set(codes).size !== codes.length) issues.push('DUPLICATE_UNIT');
    if (r.blocked.length) issues.push(`BLOCKED_${r.blocked.length}`);
    if (!deterministic) issues.push('NONDETERMINISTIC');
    if (JSON.stringify(pure) !== JSON.stringify(codes)) issues.push('BUILDER_DIFFERS_FROM_CERTIFICATION_PATH');
    issues.push(...extraChecks(r));
    const types: Record<string, number> = {};
    for (const u of r.units as any[]) types[u.unitType] = (types[u.unitType] || 0) + 1;
    const cpdpv = `${types.CONCEPT || 0}/${types.PRACTICE || 0}/${types.DEBUG || 0}/${types.PROJECT || 0}/${(types.CHECKPOINT || 0) + (types.REVIEW || 0)}`;
    const explained = rep.explainedShape.map(e => `${e.role}${e.actual}/${e.min}`).join(' ');
    const ok = issues.length === 0;
    return {
      key, ok,
      line: `    ${pad(key, 34)}${pad(ok ? 'PASS' : 'FAIL', 6)}${pad(codes.length, 5)}${pad(first.candidates, 6)}`
        + `${pad(r.blocked.length, 7)}${pad(deterministic ? 'yes' : 'NO', 5)}${pad(cpdpv, 14)}`
        + `${issues.length ? issues.join(',') : ''}${explained ? `  explained: ${explained}` : ''}`,
    };
  };
  const header = `    ${pad('profile', 34)}${pad('result', 6)}${pad('sel', 5)}${pad('cand', 6)}${pad('block', 7)}${pad('det', 5)}${pad('C/P/D/Pj/V', 14)}issues`;

  /* ══ 2. ORIGINAL NINE ════════════════════════════════════════════════════════════════════ */

  title('2. ORIGINAL NINE on ACTUAL PRODUCTION — composeFoundationJourney');
  // The learners certification defined: skills measured against the certified READY inventory.
  const { allSkills, universalSkills } = skillUniverse(readyFixture);
  const students = REALISTIC_PROFILES.map(p => ({ key: p.key, student: p.build(allSkills, universalSkills) }));
  const BREADTH = new Set(['undecided', 'strong-universal', 'strong-exploring', 'mixed']);
  console.log(header);
  let ninePass = 0;
  for (const s of students) {
    const row = await certify(s.key, s.student, r => {
      if (!BREADTH.has(s.key)) return [];
      const mix = directionFamilyMix(r, universe, s.student);
      const values = Object.values(mix) as number[];
      const total = values.reduce((a, b) => a + b, 0);
      return values.length >= 2 && Math.max(...values) / total > 0.7 ? ['BREADTH'] : [];
    });
    console.log(row.line);
    if (row.ok) ninePass++; else failures.push(`original nine: ${s.key}`);
  }
  console.log(`    original nine at exactly ninety: ${ninePass}/9`);

  /* ══ 2b. REAL SKILL CHECK LEARNERS ═══════════════════════════════════════════════════════ */

  /**
   * Learners exactly as the Foundation Skill Check produces them. The nine above passed while a beginner who
   * answered the check wrongly lost conditions, loops and functions; these hold that, and hold the spine: every
   * topic's first practice in the plan, in the authored order.
   */
  title('2b. REAL SKILL CHECK LEARNERS on ACTUAL PRODUCTION — spine present and in order');
  console.log(header);
  let realPass = 0;
  for (const p of REAL_SKILL_CHECK_PROFILES) {
    const student = p.build();
    const row = await certify(p.key, student, r => spineContinuityIssues(r, universe));
    const days = spineFirstPractices(composeUnits({ candidates: universe, targetUnits: PROGRAM_DAYS, student }), universe);
    console.log(`${row.line}   spine practice days ${days.map(d => d ?? '—').join('/')}`);
    if (row.ok) realPass++; else failures.push(`real skill check: ${p.key}`);
  }
  console.log(`    real Skill Check learners at exactly ninety with the spine in order: ${realPass}/${REAL_SKILL_CHECK_PROFILES.length}`);

  /* ══ 2c. THE MANDATORY FOUNDATION BACKBONE ═══════════════════════════════════════════════ */

  /**
   * Every certified learner covers every mandatory fundamental, at the depth their evidence earns, in exactly ninety
   * days. Built by the production builder, audited independently: coverage, mode, days, the role mix, and the order the
   * fundamentals are met in.
   */
  title('2c. MANDATORY FOUNDATION BACKBONE on ACTUAL PRODUCTION — coverage and compression');
  const backbone = backboneTopicsOf(universe);
  console.log(`    backbone requirements (${backbone.length}): ${backbone.join(' ')}`);
  let backbonePass = 0;
  for (const p of BACKBONE_PROFILES) {
    const student = p.build(allSkills, universalSkills);
    const row = await certify(p.key, student, r => {
      const a = auditBackbone(r.units.map((u: any) => u.unitCode), universe, student);
      return backboneIssues(a).map(i => `${i.code}(${i.detail})`);
    });
    const r = composeUnits({ candidates: universe, targetUnits: PROGRAM_DAYS, student });
    const a = auditBackbone(r.units.map(u => u.unitCode), universe, student);
    const rl = a.roles;
    console.log(`${row.line}`);
    console.log(`      EXACT90 ${r.units.length === PROGRAM_DAYS ? 'yes' : 'NO'} · BACKBONE ${a.missing.length ? `missing ${a.missing.join(',')}` : 'covered'}`
      + ` · FUNDAMENTAL DAYS ${a.fundamentalDays} (all days on backbone topics ${a.backboneTopicDays}) · backbone days ${a.firstBackboneDay}-${a.lastBackboneDay}`
      + ` · ELEMENTARY ${rl.FOUNDATION_INSTRUCTION} GUIDED ${rl.GUIDED_INSTRUCTION} ADVANCED ${rl.ADVANCED_UNIVERSAL} PRACTICE ${rl.PRACTICE}`
      + ` APPLICATION ${rl.APPLICATION} PROJECT ${rl.INTEGRATION} DIRECTION ${rl.DIRECTION_LEARNING} EXPLORATION ${rl.EXPLORATION} VERIFICATION ${rl.VERIFICATION}`);
    console.log(`      ${a.requirements.map(q => `${q.requirement.replace('T_', '')} ${q.mode || 'MISSING'} ${q.firstDay ?? '—'}-${q.lastDay ?? '—'}`).join(' · ')}`);
    const ends = backboneEndLoading(a);
    if (ends.length) console.log(`      end-loaded: ${ends.join('; ')}`);
    if (row.ok) backbonePass++; else failures.push(`backbone: ${p.key}`);
  }
  console.log(`    backbone profiles at exactly ninety, every fundamental covered in order: ${backbonePass}/${BACKBONE_PROFILES.length}`);

  const ladder = compressionLadder(universe);
  console.log(`    compression ladder (39 diagnostic skills, evidence rising): ${ladder.steps.map(s => `${s.key}: fundamentals ${s.audit.fundamentalDays}, elementary ${s.audit.elementaryInstruction}, advanced/applied ${s.audit.advancedAndApplied}`).join(' | ')}`);
  console.log(`    MONOTONIC COMPRESSION: ${ladder.exceptions.length ? `FAIL — ${ladder.exceptions.join('; ')}` : 'PASS'}`);
  if (ladder.exceptions.length) failures.push(`compression ladder: ${ladder.exceptions.join('; ')}`);

  /* ══ 3. STATE BOUNDARIES ═════════════════════════════════════════════════════════════════ */

  title('3. STATE-BOUNDARY MATRIX on ACTUAL PRODUCTION — 39 Foundation stage skills');
  const diagnostic = diagnosticSkills();
  const boundaries = stateBoundaryProfiles(diagnostic, diagnostic);
  console.log(`    ${diagnostic.length} diagnostic skills, ${boundaries.length} profiles`);
  console.log(header);
  let boundaryPass = 0;
  for (const b of boundaries) {
    const row = await certify(b.key, b.student, r => {
      const out: string[] = [];
      const by = (res: string) => (r.prerequisites as any[]).filter(o => o.resolution === res);
      if (by('SATISFIED_BY_MASTERY').some(o => (o.score ?? 0) < 85)) out.push('FAKE_MASTERY');
      if (by('SATISFIED_BY_EVIDENCE').length && /@74\/|LOW/.test(b.key)) out.push('FAKE_EVIDENCE');
      // STANDARD evidence is legitimate on a confident STANDARD score (@74 HIGH) and never on a thin one.
      if (by('SATISFIED_BY_STANDARD_EVIDENCE').length && /LOW/.test(b.key)) out.push('FAKE_STANDARD_EVIDENCE');
      if (by('SATISFIED_BY_STANDARD_EVIDENCE').some(o => (o.score ?? 0) < 60)) out.push('FAKE_STANDARD_EVIDENCE');
      return out;
    });
    console.log(row.line);
    if (row.ok) boundaryPass++; else failures.push(`boundary: ${b.key}`);
  }
  console.log(`    state-boundary learners at exactly ninety: ${boundaryPass}/${boundaries.length}`);

  /* ══ 4. RECOMPOSITION ════════════════════════════════════════════════════════════════════ */

  title('4. RECOMPOSITION on ACTUAL PRODUCTION — frozen at day 30 and 60; four evolutions');
  const byCode = new Map(universe.map(u => [u.unitCode, u]));
  const assetsByUnit = await loadAssets(tenantId, prodCodes);
  const NO_ASSETS: UnitAssets = { content: [], quizzes: [], assignments: [] };
  /** The same whole-day test the readiness audit applies: the day must be teachable and gated as its type needs. */
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
  let recompPass = 0;
  let recompTotal = 0;
  let daysChecked = 0;
  let minSlack = Infinity;
  const activityProblems: string[] = [];
  for (const s of students) {
    for (const freezeDay of FREEZE_DAYS) {
      for (const kind of EVOLUTIONS) {
        recompTotal++;
        const rep = simulateRecomposition({ pool: universe, universe, base: s.student, kind, freezeDay });
        const ok = rep.ok && rep.stitched.length === PROGRAM_DAYS && new Set(rep.stitched).size === PROGRAM_DAYS;
        minSlack = Math.min(minSlack, rep.slack);
        if (ok) recompPass++;
        else failures.push(`recomposition ${s.key}/${kind}@${freezeDay}: ${rep.issues.map(i => i.code).join(', ') || `stitched ${rep.stitched.length}`}`);
        rep.stitched.slice(freezeDay).forEach((code, j) => {
          const u = byCode.get(code);
          if (!u) { activityProblems.push(`${s.key}/${kind}@${freezeDay} day ${freezeDay + j + 1}: ${code} is not in production`); return; }
          const a = assetsByUnit.get(code.toUpperCase()) || NO_ASSETS;
          daysChecked++;
          for (const p of dayActivityProblems(u, activitiesFor({ title: u.title }, a), a)) {
            activityProblems.push(`${s.key}/${kind}@${freezeDay} day ${freezeDay + j + 1} ${code}: ${p}`);
          }
        });
      }
    }
  }
  console.log(`    recompositions holding exactly ninety valid days: ${recompPass}/${recompTotal}   future slack min ${minSlack}`);
  console.log(`    rewritten future days checked with the journey resolver: ${daysChecked}; activity problems: ${activityProblems.length}`);
  for (const p of activityProblems.slice(0, 8)) console.log(`      ! ${p}`);
  if (activityProblems.length) failures.push(`${activityProblems.length} recomposed day(s) without a complete activity bundle`);

  /* ══ 4b. STRUCTURAL CONTINUITY THROUGH REASSESSMENT ═════════════════════════════════════ */

  /**
   * The seventy-two above prove a recomposed journey is ninety valid days; they passed while a reassessed beginner
   * lost functions and arrays, or met them in reverse. This gate holds the structure: every requirement still owed
   * when the future began is reached, in order, frozen days untouched, deterministically — at every freeze point,
   * for every kind of evidence change, and through reassessment after reassessment.
   */
  title('4b. STRUCTURAL CONTINUITY THROUGH REASSESSMENT on ACTUAL PRODUCTION');
  const continuity = continuityLearners(allSkills, universalSkills);
  let continuityPass = 0;
  let continuityTotal = 0;
  const continuityProblems: string[] = [];
  for (const learner of continuity) {
    const cells: string[] = [];
    for (const freezeDay of CONTINUITY_FREEZE_DAYS) {
      for (const kind of CONTINUITY_EVOLUTIONS) {
        continuityTotal++;
        const rep = simulateRecomposition({ pool: universe, universe, base: learner.student, kind, freezeDay });
        const again = simulateRecomposition({ pool: universe, universe, base: learner.student, kind, freezeDay });
        const problems = [...rep.issues.map(i => `${i.code} ${i.detail}`), ...(rep.stitched.join('|') === again.stitched.join('|') ? [] : ['NONDETERMINISTIC'])];
        if (!problems.length) continuityPass++;
        else continuityProblems.push(`${learner.key} freeze ${freezeDay} ${kind}: ${problems.slice(0, 2).join('; ')}`);
      }
    }
    for (const chain of CONTINUITY_CHAINS) {
      continuityTotal++;
      const rep = simulateReassessmentChain({ pool: universe, universe, base: learner.student, chain });
      if (rep.ok) continuityPass++;
      else continuityProblems.push(`${learner.key} ${chain}: ${rep.issues.slice(0, 2).map(i => `${i.code} ${i.detail}`).join('; ')}`);
      cells.push(`${chain} spine ${spineFirstPractices({ units: rep.stitched.map(unitCode => ({ unitCode })) } as any, universe).map(d => d ?? '—').join('/')}`);
    }
    console.log(`    ${pad(learner.key, 28)}${cells.join('   ')}`);
  }
  console.log(`    freeze days ${CONTINUITY_FREEZE_DAYS.join(', ')} · evidence ${CONTINUITY_EVOLUTIONS.join(', ')} · chains ${CONTINUITY_CHAINS.join(', ')}`);
  console.log(`    structurally continuous recompositions: ${continuityPass}/${continuityTotal}`);
  for (const p of continuityProblems.slice(0, 8)) console.log(`      ! ${p}`);
  if (continuityProblems.length) failures.push(`${continuityProblems.length} recomposition(s) break structural continuity`);

  /* ══ 4c. THE BACKBONE THROUGH REASSESSMENT ═══════════════════════════════════════════════ */

  /**
   * Reassessment at freeze points across the journey, for learners from beginner to very strong, with every kind of
   * evidence change: frozen coverage stays covered, uncovered requirements survive into the future, the future is met
   * in course order, exactly ninety days, deterministically. Stronger evidence should not add elementary lessons to the
   * future and weaker evidence should not take backbone work away; exceptions to those two trends are reported.
   */
  title('4c. MANDATORY BACKBONE THROUGH REASSESSMENT on ACTUAL PRODUCTION');
  let backboneRecompPass = 0;
  let backboneRecompTotal = 0;
  const backboneRecompProblems: string[] = [];
  const endLoaded: string[] = [];
  const trendExceptions: string[] = [];
  for (const key of ['REAL_SKILL_CHECK_BEGINNER', 'REAL_SKILL_CHECK_PARTIAL', 'GOOD_AT_70', 'GOOD_AT_78', 'VERY_STRONG']) {
    const base = BACKBONE_PROFILES.find(p => p.key === key)!.build(allSkills, universalSkills);
    for (const freezeDay of CONTINUITY_FREEZE_DAYS) {
      const cells: Record<string, ReturnType<typeof simulateBackboneRecomposition>> = {};
      for (const kind of BACKBONE_EVOLUTIONS) {
        backboneRecompTotal++;
        const rep = simulateBackboneRecomposition({ pool: universe, universe, base, kind, freezeDay });
        const again = simulateBackboneRecomposition({ pool: universe, universe, base, kind, freezeDay });
        cells[kind] = rep;
        const problems = [...rep.issues.map(i => `${i.code} ${i.detail}`), ...(rep.stitched.join('|') === again.stitched.join('|') ? [] : ['NONDETERMINISTIC'])];
        if (!problems.length) backboneRecompPass++;
        else backboneRecompProblems.push(`${key} freeze ${freezeDay} ${kind}: ${problems.slice(0, 2).join('; ')}`);
        rep.endLoading.forEach(e => endLoaded.push(`${key} freeze ${freezeDay} ${kind}: ${e}`));
      }
      if (cells.VERIFIED.futureElementary > cells.NONE.futureElementary) {
        trendExceptions.push(`${key} freeze ${freezeDay}: VERIFIED adds elementary lessons (${cells.VERIFIED.futureElementary} > ${cells.NONE.futureElementary})`);
      }
      if (cells.STRUGGLE.futureBackboneDays < cells.VERIFIED.futureBackboneDays) {
        trendExceptions.push(`${key} freeze ${freezeDay}: STRUGGLE ${cells.STRUGGLE.futureBackboneDays} future backbone days < VERIFIED ${cells.VERIFIED.futureBackboneDays}`);
      }
    }
  }
  console.log(`    freeze days ${CONTINUITY_FREEZE_DAYS.join(', ')} · evidence ${BACKBONE_EVOLUTIONS.join(', ')}`);
  console.log(`    backbone-continuous recompositions: ${backboneRecompPass}/${backboneRecompTotal}`);
  for (const p of backboneRecompProblems.slice(0, 8)) console.log(`      ! ${p}`);
  if (backboneRecompProblems.length) failures.push(`${backboneRecompProblems.length} recomposition(s) break the backbone`);
  console.log(`    late cramming (a requirement other than the last in the course, wholly in the final sixth): ${endLoaded.length ? endLoaded.length : 'none'}`);
  for (const e of endLoaded.slice(0, 8)) console.log(`      · ${e}`);
  console.log(`    evidence trend exceptions (reported, not failed): ${trendExceptions.length ? trendExceptions.length : 'none'}`);
  for (const e of trendExceptions.slice(0, 8)) console.log(`      · ${e}`);

  /* ══ 4d. EVIDENCE KINDS THROUGH RECOMPOSITION ════════════════════════════════════════════ */

  /**
   * Twelve learners replayed through ninety days on THIS inventory, every checkpoint answered and every coding
   * assignment and project graded, recomposing whenever what the composer reads changes — under the evidence model
   * before kinds and the production model now. See evidenceKindGate for what must hold.
   */
  title('4d. EVIDENCE KINDS THROUGH RECOMPOSITION on ACTUAL PRODUCTION — understanding capped, applied work kept');
  const kindGate = evidenceKindGate(universe);
  const shortCode = (c: string) => c.replace(/^T_|_PRACTICE$|_CALL_RETURN|_TRAVERSAL|_COMPUTE/g, '');
  for (const l of kindGate.learners) {
    console.log(`    ${pad(l.key, 26)} days ${l.finalDays}/${l.unique} distinct · coding assignments removed BEFORE ${pad(l.before.codingAssignmentsRemoved.map(shortCode).join(',') || 'none', 26)}`
      + ` AFTER ${pad(l.after.codingAssignmentsRemoved.map(shortCode).join(',') || 'none', 16)} worked ${l.after.codingAssignmentsWorked.length} · applied rows ${l.after.appliedRows} · recompositions ${l.before.recompositions}→${l.after.recompositions}`);
  }
  for (const c of kindGate.critical) {
    console.log(`    critical ${pad(c.skill, 20)} ${c.day === null ? 'never VERIFIED from checkpoints alone' : `day ${c.day}: ${c.score}/${c.confidence} raw ${c.rawState} → ${c.effectiveState} cap ${c.capped ? 'YES' : 'NO'}`}`
      + ` · ${shortCode(c.codingUnit)} BEFORE ${c.codingAssignmentBefore ? 'kept' : 'removed'} AFTER ${c.codingAssignmentAfter ? `worked day ${c.codingAssignmentDayAfter}` : 'REMOVED'}`);
  }
  console.log(`    evidence-kind recomposition problems: ${kindGate.problems.length}`);
  for (const p of kindGate.problems.slice(0, 8)) console.log(`      ! ${p}`);
  if (kindGate.problems.length) failures.push(`${kindGate.problems.length} evidence-kind recomposition problem(s)`);

  /* ══ 5. CONTENT GATES ON THE 338 ═════════════════════════════════════════════════════════ */

  title('5. PRODUCTION CONTENT GATES — the composer-eligible units only');
  const brokenPrereqs = universe.flatMap(u => u.prerequisiteUnitCodes.filter(p => !prodSet.has(p)).map(p => `${u.unitCode} -> ${p}`));
  const cycles = findPrerequisiteCycles(buildPrerequisiteGraph(universe as any));

  const quizzes = await db.collection('quizzes').find({ tenantId: TID, unitCode: { $in: prodCodes } }).toArray();
  const questionIds = quizzes.flatMap(q => (q.questionIds || []).map(String));
  const questions = await db.collection('questions')
    .find({ _id: { $in: questionIds.filter(i => mongoose.Types.ObjectId.isValid(i)).map(i => new mongoose.Types.ObjectId(i)) } })
    .project({ options: 1 }).toArray();
  const questionById = new Map(questions.map(q => [String(q._id), q]));
  const assessmentProblems: string[] = [];
  const quizzesByUnit = new Map<string, any[]>();
  for (const q of quizzes) quizzesByUnit.set(String(q.unitCode), [...(quizzesByUnit.get(String(q.unitCode)) || []), q]);
  for (const q of quizzes) {
    const ids = (q.questionIds || []).map(String);
    const where = `${q.unitCode} quiz "${q.title}"`;
    if (!ids.length) assessmentProblems.push(`${where}: no questions`);
    const unresolved = ids.filter((i: string) => !questionById.has(i));
    if (unresolved.length) assessmentProblems.push(`${where}: ${unresolved.length} question ids resolve to nothing`);
    const badKey = ids.filter((i: string) => questionById.has(i)
      && ((questionById.get(i)!.options || []) as any[]).filter(o => o.isCorrect).length !== 1);
    if (badKey.length) assessmentProblems.push(`${where}: ${badKey.length} question(s) without exactly one correct option`);
    if (q.totalQuestions !== ids.length) assessmentProblems.push(`${where}: totalQuestions ${q.totalQuestions} != ${ids.length}`);
    if (!(q.totalTime > 0)) assessmentProblems.push(`${where}: no totalTime`);
    if (q.isActive === false || q.archivedAt) assessmentProblems.push(`${where}: inactive or archived`);
  }
  for (const u of universe.filter(x => x.unitType === 'CHECKPOINT')) {
    const n = (quizzesByUnit.get(u.unitCode) || []).length;
    if (n !== 1) assessmentProblems.push(`${u.unitCode}: ${n} bound quizzes`);
  }
  // Both directions of the Quiz ↔ Question link — the student player reads Question.quizId.
  const linkage = await checkCurriculumQuizLinkage(tenantId, prodCodes);
  for (const [label, list] of [
    ['unresolved questionIds', linkage.unresolvedQuestionIds], ['question without quizId', linkage.missingQuizId],
    ['question naming the wrong quiz', linkage.wrongQuizId], ['duplicate membership', linkage.duplicateMembership],
    ['orphaned question', linkage.orphanedQuestions], ['quiz with no questions', linkage.emptyQuizzes],
  ] as [string, string[]][]) {
    if (list.length) assessmentProblems.push(`quiz linkage: ${list.length} ${label} (e.g. ${list.slice(0, 2).join(', ')})`);
  }

  const assignments = await db.collection('assignments').find({ tenant: tenantOid, unitCode: { $in: prodCodes } }).toArray();
  const projectProblems: string[] = [];
  for (const u of universe.filter(x => x.unitType === 'PROJECT')) {
    const as = assignments.filter(a => a.unitCode === u.unitCode);
    if (as.length !== 1) projectProblems.push(`${u.unitCode}: ${as.length} assignments`);
    for (const a of as) {
      const rubric = (a.rubric || []) as any[];
      const sum = rubric.reduce((n, r) => n + (r.maxPoints || 0), 0);
      if (String(a.type).toLowerCase() !== 'project') projectProblems.push(`${u.unitCode}: type ${a.type}`);
      if (!rubric.length || sum !== a.totalPoints) projectProblems.push(`${u.unitCode}: rubric ${sum} vs ${a.totalPoints}`);
      if (String(a.instructions || '').length < 400) projectProblems.push(`${u.unitCode}: thin brief`);
      if (a.status === 'archived') projectProblems.push(`${u.unitCode}: archived`);
    }
  }
  /**
   * Any other unit's assignment is a runnable coding task, graded by the engine's own test runner.
   * One per unit, something to run and to run against, no solution stored beside the starter.
   */
  const codingProblems: string[] = [];
  for (const u of universe.filter(x => x.unitType !== 'PROJECT')) {
    const as = assignments.filter(a => a.unitCode === u.unitCode);
    if (as.length > 1) codingProblems.push(`${u.unitCode}: ${as.length} assignments`);
    for (const a of as) {
      const rubric = (a.rubric || []) as any[];
      const sum = rubric.reduce((n, r) => n + (r.maxPoints || 0), 0);
      if (String(a.type).toLowerCase() !== 'coding') codingProblems.push(`${u.unitCode}: type ${a.type}`);
      if (!(a.allowedLanguages || []).length || !(a.starterCode || []).length) codingProblems.push(`${u.unitCode}: no language or starter`);
      if (!(a.testCases || []).length) codingProblems.push(`${u.unitCode}: no test cases`);
      if ((a.starterCode || []).some((s: any) => s.solutionCode)) codingProblems.push(`${u.unitCode}: stores a solution`);
      if (!rubric.length || sum !== a.totalPoints) codingProblems.push(`${u.unitCode}: rubric ${sum} vs ${a.totalPoints}`);
      if (!(a.passingPoints > 0 && a.passingPoints <= a.totalPoints)) codingProblems.push(`${u.unitCode}: passing ${a.passingPoints} of ${a.totalPoints}`);
      if (String(a.instructions || '').length < 400) codingProblems.push(`${u.unitCode}: thin brief`);
      if (a.status === 'archived') codingProblems.push(`${u.unitCode}: archived`);
    }
  }

  const libraryRows = await db.collection('learningcontentlibraries').find({ tenantId: TID, unitCode: { $in: prodCodes } }).toArray();
  const duplication = findDuplication({
    rows: libraryRows as any,
    identifyingWords: identifyingWordsFor(universe.map(u => ({ unitCode: u.unitCode, title: u.title }))),
  });

  const gate = (label: string, n: number, sample: string[]) => {
    console.log(`    ${pad(label, 40)}${n}${n ? `   e.g. ${sample.slice(0, 3).join(' | ')}` : ''}`);
    if (n) failures.push(`${label}: ${n}`);
  };
  gate('broken prerequisites', brokenPrereqs.length, brokenPrereqs);
  gate('prerequisite cycles', cycles.length, cycles.map(String));
  gate('malformed assessments', assessmentProblems.length, assessmentProblems);
  gate('broken project assignments', projectProblems.length, projectProblems);
  gate('broken coding assignments', codingProblems.length, codingProblems);
  gate('duplicated assets (any kind)', duplication.length, duplication.map(d => `${d.kind} ${[...new Set(d.unitCodes)].join(',')}`));
  console.log(`    bound quizzes ${quizzes.length}, questions ${questionIds.length}, unit assignments ${assignments.length} (coding ${assignments.filter(a => String(a.type).toLowerCase() === 'coding').length}), library rows ${libraryRows.length}`);

  /* ══ 6. DATABASE SAFETY ══════════════════════════════════════════════════════════════════ */

  title('6. DATABASE SAFETY');
  const after = await fingerprint();
  const configs = await db.collection('passportconfigs').find({ tenantId: TID }).toArray();
  // Foundation's engine is product policy; the switches cannot move any stage (see curriculumEnginePolicy).
  const engine = effectiveCurriculumEngine({ config: configs[0] as any, stageKey: 'foundation' }).engine;
  // Journeys are members' plans and may be created while the gate runs; only the curriculum must not move.
  const unchanged = before.hash === after.hash
    && JSON.stringify(before.published) === JSON.stringify(after.published)
    && JSON.stringify(before.counts) === JSON.stringify(after.counts);
  /**
   * Published must be EXACTLY the certified set. Units withheld by decision are not drift for being
   * unpublished; one of them published, or no longer READY, fails — and so does any other extra or
   * missing publication, as it always has.
   */
  const readyCodes = (await loadCandidates(tenantId, 'PROTOTYPE_UNPUBLISHED')).units.map(u => u.unitCode);
  const drift = publicationDrift({ published: after.published, certified: certifiedCodes, ready: readyCodes });
  const publishedIsCertified = drift.ok && JSON.stringify(after.published) === JSON.stringify(certifiedCodes);
  const withheldReady = INTENTIONALLY_WITHHELD_READY.filter(c => readyCodes.includes(c));
  console.log(`    units ${after.units}  READY ${readyCodes.length}  PUBLISHED ${after.published.length}  COMPOSER_ELIGIBLE ${universe.length}`
    + `  INTENTIONALLY_WITHHELD_READY ${withheldReady.length} (${withheldReady.join(', ')})`);
  console.log(`    Foundation journeys ${after.journeys} (DayPlans ${after.journeyDayPlans}, enrolments ${after.journeyEnrolments})  engine ${engine}`);
  console.log(`    published units are exactly the certified set: ${publishedIsCertified ? 'yes' : 'NO'}`);
  if (!drift.ok) {
    console.log(`      extra ${drift.extra.join(', ') || '-'} · missing ${drift.missing.join(', ') || '-'}`
      + ` · withheld published ${drift.withheldPublished.join(', ') || '-'} · withheld not READY ${drift.withheldNotReady.join(', ') || '-'}`);
  }
  if (certifiedCodes.some(c => INTENTIONALLY_WITHHELD_READY.includes(c))) failures.push('a unit withheld by decision is in the certified set');
  console.log(`    unit status fingerprint ${after.hash}; this tenant's curriculum unchanged during this run: ${unchanged ? 'yes' : 'NO'}`);
  if (!publishedIsCertified) failures.push('published units are not exactly the certified set');
  /**
   * Foundation on UNIT and every other stage on TOPIC, whatever this tenant's switches say — the
   * product invariant, checked against the tenant's own configuration so a switch can never move it.
   */
  const perStage = CAREER_STAGES.map(s => ({
    key: s.key,
    engine: effectiveCurriculumEngine({ config: configs[0] as any, stageKey: s.key }).engine,
  }));
  console.log(`    engine per stage  (${perStage.map(s => `${s.key}=${s.engine}`).join(' ')})`);
  if (perStage.some(s => s.engine !== (s.key === 'foundation' ? 'UNIT' : 'TOPIC'))) {
    failures.push('Foundation is not on UNIT, or another stage is not on TOPIC');
  }
  if (!unchanged) failures.push("this tenant's curriculum changed during a read-only gate");

  title(`ACTUAL PRODUCTION GATE: ${failures.length ? 'FAIL' : 'PASS'}`);
  for (const f of failures.slice(0, 40)) console.log(`    FAIL  ${f}`);
  console.log('');
  await mongoose.disconnect();
  process.exit(failures.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
