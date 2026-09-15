/**
 * Where every Year-1 Learning Unit stands, and what it still needs.
 *
 * READ ONLY. The single source for "is the mega curriculum schedulable yet", and deliberately
 * the same evaluator the admin screen and the future composer use — a report with its own copy
 * of the rule would eventually disagree with the product, and the disagreement would be
 * discovered by a student.
 *
 * COMPOSER ELIGIBILITY IS TWO CONDITIONS, NOT ONE. status = PUBLISHED and readiness = READY.
 * Publishing is an author's decision about whether a unit should be used; readiness is a fact
 * about whether it can teach. Conflating them is what let 310 units look covered while 39
 * distinct bundles sat behind them.
 *
 *   npx ts-node src/scripts/reportUnitReadiness.ts <tenantId>
 *   npx ts-node src/scripts/reportUnitReadiness.ts <tenantId> --gaps      list what each unit needs
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import CurriculumLearningUnit from '../models/CurriculumLearningUnit';
import LearningContentLibrary from '../models/LearningContentLibrary';
import LearningCurriculum from '../models/LearningCurriculum';
import Quiz from '../models/Quiz';
import Assignment from '../models/Assignment';
import { evaluateReadiness, UnitReadiness, READINESS_ORDER } from '../data/unitReadinessPolicy';
import { findDuplication, identifyingWordsFor } from '../services/contentDuplicationService';
import { teaches, roleOf } from '../data/contentBundlePolicy';
import { engineActivationState } from '../data/curriculumEnginePolicy';

dotenv.config();

const STAGE = 'foundation';

(async () => {
  const tenantId = process.argv[2];
  const showGaps = process.argv.includes('--gaps');
  if (!tenantId) {
    console.error('Usage: reportUnitReadiness.ts <tenantId> [--gaps]');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  const tenantOid = mongoose.Types.ObjectId.isValid(tenantId)
    ? new mongoose.Types.ObjectId(tenantId) : null;

  const [units, published, curriculum, quizzes, assignments, allLibrary] = await Promise.all([
    CurriculumLearningUnit.find({ tenantId, stageKey: STAGE }).lean() as any,
    LearningContentLibrary.find({ tenantId, isPublished: true })
      .select('type topicCode skillKeys unitCode').lean() as any,
    LearningCurriculum.findOne({ tenantId, adaptiveStage: STAGE }).select('title modules topics').lean() as any,
    Quiz.find({ tenantId, unitCode: { $exists: true, $ne: '' } }).select('unitCode').lean() as any,
    // Assignment scopes by `tenant` (ObjectId), not `tenantId`. See the model.
    tenantOid
      ? Assignment.find({ tenant: tenantOid, unitCode: { $exists: true, $ne: '' } }).select('unitCode').lean() as any
      : Promise.resolve([] as any),
    LearningContentLibrary.find({ tenantId })
      .select('_id unitCode title type notesContent practiceQuestions isPublished createdBy').lean() as any,
  ]);

  const moduleName = new Map<string, string>(
    ((curriculum?.modules || []) as any[]).map(m => [String(m.moduleCode), String(m.moduleName)]),
  );
  const topicTitle = new Map<string, string>(
    ((curriculum?.topics || []) as any[]).filter(t => t.topicCode)
      .map(t => [String(t.topicCode), String(t.title)]),
  );

  const byUnitCode = new Map<string, any[]>();
  const byTopicCode = new Map<string, any[]>();
  const bySkillKey = new Map<string, any[]>();
  for (const r of published as any[]) {
    if (r.unitCode) byUnitCode.set(String(r.unitCode), [...(byUnitCode.get(String(r.unitCode)) || []), r]);
    if (r.topicCode) byTopicCode.set(String(r.topicCode), [...(byTopicCode.get(String(r.topicCode)) || []), r]);
    for (const k of r.skillKeys || []) bySkillKey.set(String(k), [...(bySkillKey.get(String(k)) || []), r]);
  }

  const assessmentsByUnit = new Map<string, number>();
  for (const row of [...(quizzes as any[]), ...(assignments as any[])]) {
    const k = String(row.unitCode);
    assessmentsByUnit.set(k, (assessmentsByUnit.get(k) || 0) + 1);
  }

  /** Assignments alone: only they can receive submitted work, which is what a PROJECT needs. */
  const assignmentsByUnit = new Map<string, number>();
  for (const row of assignments as any[]) {
    const k = String(row.unitCode);
    assignmentsByUnit.set(k, (assignmentsByUnit.get(k) || 0) + 1);
  }

  interface Row {
    unit: any;
    readiness: UnitReadiness;
    missing: string[];
    own: { teachingCount: number; practiceCount: number; assessmentCount: number };
    inheritedCount: number;
    hasVideo: boolean;
  }

  const rows: Row[] = (units as any[]).map(unit => {
    const own = byUnitCode.get(String(unit.unitCode)) || [];
    let inherited = own.length ? [] : (byTopicCode.get(String(unit.topicCode)) || []);
    if (!own.length && !inherited.length) {
      const seen = new Set<string>();
      inherited = (unit.skillKeys || []).flatMap((k: string) => bySkillKey.get(String(k)) || [])
        .filter((r: any) => { const id = String(r._id); if (seen.has(id)) return false; seen.add(id); return true; });
    }
    const r = evaluateReadiness({
      unitType: unit.unitType,
      ownContent: own,
      inheritedContent: inherited,
      boundAssessments: assessmentsByUnit.get(String(unit.unitCode)) || 0,
      boundAssignments: assignmentsByUnit.get(String(unit.unitCode)) || 0,
    });
    return {
      unit,
      readiness: r.readiness,
      missing: r.missing,
      own: r.own,
      inheritedCount: r.inheritedCount,
      hasVideo: own.some((c: any) => String(c.type) === 'video'),
    };
  });

  /* ---------------------------------------------------------------- */

  const line = (n = 82) => console.log('-'.repeat(n));
  const pct = (n: number, d: number) => d ? `${((n / d) * 100).toFixed(1)}%` : '0%';

  const tally = (list: Row[]) => {
    const t: Record<UnitReadiness, number> =
      { EMPTY: 0, PARTIAL: 0, TEACHABLE: 0, ASSESSABLE: 0, READY: 0 };
    for (const r of list) t[r.readiness]++;
    return t;
  };

  const tallyLine = (t: Record<UnitReadiness, number>) =>
    READINESS_ORDER.map(k => `${k[0]}${t[k]}`).join(' ');

  console.log(`\nYEAR-1 UNIT CONTENT COVERAGE`);
  console.log(`${curriculum?.title}  ·  tenant ${tenantId}`);
  line();

  const all = tally(rows);
  console.log('  READINESS');
  for (const k of READINESS_ORDER) {
    const bar = '#'.repeat(Math.round((all[k] / Math.max(1, rows.length)) * 40));
    console.log(`    ${k.padEnd(12)}${String(all[k]).padStart(5)}  ${pct(all[k], rows.length).padStart(7)}  ${bar}`);
  }
  console.log(`    ${'total'.padEnd(12)}${String(rows.length).padStart(5)}`);

  const publishedUnits = rows.filter(r => r.unit.status === 'PUBLISHED');
  const composerReady = rows.filter(r => r.unit.status === 'PUBLISHED' && r.readiness === 'READY');
  console.log('');
  console.log(`    units PUBLISHED            ${publishedUnits.length}`);
  console.log(`    readiness = READY          ${all.READY}`);
  console.log(`    COMPOSER ELIGIBLE          ${composerReady.length}   (PUBLISHED **and** READY)`);

  line();
  console.log('  BY MODULE');
  const byModule = new Map<string, Row[]>();
  for (const r of rows) {
    const m = String(r.unit.moduleCode || 'UNGROUPED');
    byModule.set(m, [...(byModule.get(m) || []), r]);
  }
  for (const [code, list] of [...byModule.entries()].sort()) {
    const t = tally(list);
    console.log(`    ${String(moduleName.get(code) || code).slice(0, 34).padEnd(36)}`
      + `${String(list.length).padStart(4)}   ${tallyLine(t).padEnd(28)}${pct(t.READY, list.length).padStart(7)}`);
  }

  line();
  console.log('  BY TOPIC  (only topics with any authored content)');
  const byTopic = new Map<string, Row[]>();
  for (const r of rows) {
    const t = String(r.unit.topicCode);
    byTopic.set(t, [...(byTopic.get(t) || []), r]);
  }
  for (const [code, list] of [...byTopic.entries()].sort()) {
    const t = tally(list);
    if (!t.READY && !t.TEACHABLE && !t.ASSESSABLE) continue;
    console.log(`    ${code.padEnd(26)}${String(topicTitle.get(code) || '').slice(0, 26).padEnd(28)}`
      + `${String(list.length).padStart(3)}   ${tallyLine(t)}`);
  }

  line();
  console.log('  BY UNIT TYPE');
  const byType = new Map<string, Row[]>();
  for (const r of rows) {
    const k = String(r.unit.unitType);
    byType.set(k, [...(byType.get(k) || []), r]);
  }
  for (const [k, list] of [...byType.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`    ${k.padEnd(16)}${String(list.length).padStart(4)}   ${tallyLine(tally(list))}`);
  }

  console.log('\n  BY CATEGORY');
  const byCat = new Map<string, Row[]>();
  for (const r of rows) {
    const k = String(r.unit.category);
    byCat.set(k, [...(byCat.get(k) || []), r]);
  }
  for (const [k, list] of [...byCat.entries()].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`    ${k.padEnd(16)}${String(list.length).padStart(4)}   ${tallyLine(tally(list))}`);
  }

  /* ---- what was produced ------------------------------------------------- */

  line();
  const authored = (allLibrary as any[]).filter(r => r.unitCode);
  const byAssetType = new Map<string, number>();
  for (const r of authored) byAssetType.set(String(r.type), (byAssetType.get(String(r.type)) || 0) + 1);

  console.log('  CONTENT PRODUCED');
  console.log(`    library rows with a unitCode   ${authored.length}`);
  for (const [t, n] of [...byAssetType.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`      ${t.padEnd(24)}${String(n).padStart(4)}`);
  }
  console.log(`    quizzes bound                  ${(quizzes as any[]).length}`);
  console.log(`    assignments bound              ${(assignments as any[]).length}`);
  console.log(`    coding exercises               ${authored.filter(r => r.type === 'practice_coding')
    .reduce((n, r) => n + (r.practiceQuestions?.length || 0), 0)}`);
  console.log(`    worked examples                ${byAssetType.get('worked_example') || 0}`);
  console.log(`    topic-level rows (untouched)   ${(allLibrary as any[]).length - authored.length}`);

  /* ---- gaps -------------------------------------------------------------- */

  line();
  const needAuthoring = rows.filter(r => r.readiness === 'PARTIAL' || r.readiness === 'EMPTY');
  const readyNoVideo = rows.filter(r => r.readiness === 'READY' && !r.hasVideo);

  console.log('  GAPS');
  console.log(`    units still needing authoring  ${needAuthoring.length}   ${pct(needAuthoring.length, rows.length)}`);
  console.log(`    READY units with no video      ${readyNoVideo.length}   (allowed: video is optional in Foundation V1)`);
  console.log(`    units with a video at all      ${rows.filter(r => r.hasVideo).length}`);

  /* ---- duplication ------------------------------------------------------- */

  const findings = findDuplication({
    rows: authored as any,
    identifyingWords: identifyingWordsFor(
      (units as any[]).map(u => ({ unitCode: String(u.unitCode), title: String(u.title) })),
    ),
  });

  console.log('');
  console.log(`  DUPLICATION WARNINGS            ${findings.length}`);
  for (const f of findings.slice(0, 10)) {
    console.log(`      ${f.kind.padEnd(30)}${String(f.similarity).padStart(5)}  ${f.unitCodes.join(' / ')}`);
  }
  if (!findings.length) {
    console.log('      none — no authored asset is a near-copy of another');
  }

  if (showGaps) {
    line();
    console.log('  WHAT EACH UNAUTHORED UNIT NEEDS');
    for (const r of needAuthoring.slice(0, 60)) {
      console.log(`    ${String(r.unit.unitCode).padEnd(34)}${String(r.unit.unitType).padEnd(10)}${r.missing[0] || ''}`);
    }
    if (needAuthoring.length > 60) console.log(`    … and ${needAuthoring.length - 60} more`);
  }

  line();
  console.log(`  Units a composer could schedule today: ${composerReady.length} of ${rows.length}.`);
  const configs = await mongoose.connection.db!.collection('passportconfigs')
    .find({ tenantId: { $in: [tenantId, tenantOid].filter(Boolean) } }).toArray();
  const activation = engineActivationState(configs as any[]);
  console.log(activation === 'OFF'
    ? '  Production engine: TOPIC. Nothing here changes what a student sees.\n'
    : `  Production engine: ${activation === 'FOUNDATION_UNIT' ? 'UNIT for Foundation, TOPIC for every other stage' : 'switched on OUTSIDE the authorised Foundation activation'}. `
      + 'Foundation journeys compose from the PUBLISHED and READY units above.\n');

  await mongoose.disconnect();
})().catch(e => { console.error(e); process.exit(1); });
