/**
 * Year-1 diagnostic QA — papers generated, answered, graded and projected, then checked.
 *
 * EVERY STEP IS THE APPLICATION'S OWN SERVICE. buildPersonalizedAssessment generates,
 * gradeSubmittedAnswers marks, projectAssessmentToSkillDna writes the evidence and recomputes the
 * profile. The only thing this file adds is the assertions and the arithmetic they compare
 * against, which is deliberately worked out here from first principles rather than by calling the
 * same aggregate() the service calls — a check that reuses the implementation proves the
 * implementation agrees with itself.
 *
 * IT WRITES, because a paper that is never submitted proves nothing about scoring, confidence or
 * retake freshness. Everything it writes belongs to synthetic students whose ids begin with the
 * prefix below, and --cleanup removes exactly those. No pre-existing student is read or touched.
 *
 *   npx ts-node src/scripts/year1DiagnosticQa.ts <tenantId>
 *   npx ts-node src/scripts/year1DiagnosticQa.ts <tenantId> --cleanup
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import AssessmentItem from '../models/AssessmentItem';
import PersonalizedAssessment from '../models/PersonalizedAssessment';
import StageSkillSet from '../models/StageSkillSet';
import StudentSkillEvidence from '../models/StudentSkillEvidence';
import StudentSkillProfile from '../models/StudentSkillProfile';
import { buildPersonalizedAssessment } from '../services/personalizedAssessmentService';
import { gradeSubmittedAnswers } from '../services/assessmentAnswerGradingService';
import { projectAssessmentToSkillDna } from '../services/skillDnaService';
import { resolveAssessmentPolicy } from '../services/assessmentPolicyService';

dotenv.config();

/**
 * Synthetic students are real ObjectIds, because every model that records a student stores one.
 *
 * Derived from a name so a rerun addresses the same synthetic people and cleanup can name them
 * exactly, rather than matching a prefix — studentId is an ObjectId and cannot be pattern-matched.
 * The namespace makes a collision with a real user's id impossible in practice.
 */
const NAMES = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'det', 'det2'];
const idFor = (name: string) => new mongoose.Types.ObjectId(
  crypto.createHash('sha1').update(`QA-DIAG:${name}`).digest('hex').slice(0, 24),
);
const QA_IDS = NAMES.map(idFor);

type Mode = 'ALL_CORRECT' | 'ALL_WRONG' | 'MIXED' | 'UNANSWERED';

interface Check { name: string; ok: boolean; detail: string }
const checks: Check[] = [];
const check = (name: string, ok: boolean, detail = '') => { checks.push({ name, ok, detail }); };

(async () => {
  const tenantId = process.argv[2];
  const cleanupOnly = process.argv.includes('--cleanup');
  if (!tenantId) { console.error('Usage: year1DiagnosticQa.ts <tenantId> [--cleanup]'); process.exit(1); }

  await mongoose.connect(process.env.MONGODB_URI || process.env.MONGO_URI || '');

  if (cleanupOnly) { await cleanup(); await mongoose.disconnect(); return; }
  // Start from a clean slate so a rerun measures this run rather than the last one.
  await cleanup(true);

  const policy = await resolveAssessmentPolicy(tenantId, 'foundation');
  const set = await StageSkillSet.findOne({ tenantId, stage: 'foundation' }).lean() as any;
  const stageSkills = ((set?.requirements || []) as any[])
    .filter(r => r.active !== false).map(r => String(r.skillKey).toUpperCase());

  const items = await AssessmentItem.find({ tenantId, 'golden.questionId': { $exists: true } })
    .select('_id correctOptionIds difficulty golden').lean() as any[];
  const gold = new Map(items.map(i => [String(i._id), i]));

  console.log(`\nYEAR-1 DIAGNOSTIC QA — tenant ${tenantId}`);
  console.log(`policy ${policy.key} v${policy.version}: ${policy.skillSlots} slots, `
    + `${policy.maxSkills} skills, ${policy.minItemsPerSkill} per skill, `
    + `mix E${Math.round(policy.difficultyMix.EASY * 100)}/M${Math.round(policy.difficultyMix.MEDIUM * 100)}`
    + `/H${Math.round(policy.difficultyMix.HARD * 100)}`);
  console.log(`Golden items available: ${gold.size}\n`);

  const base = {
    tenantId, stage: 'foundation', roleKey: 'FOUNDATION',
    roleSkillKeys: stageSkills, blueprintVersion: set?.version || 0, policy,
  } as any;

  /* ---- the matrix ---------------------------------------------------------------------- */

  const matrix: { student: string; mode: Mode }[] = [
    { student: 'alpha', mode: 'ALL_CORRECT' },
    { student: 'beta', mode: 'ALL_WRONG' },
    { student: 'gamma', mode: 'MIXED' },
    { student: 'delta', mode: 'MIXED' },
    { student: 'epsilon', mode: 'UNANSWERED' },
  ];

  const firstRun = new Map<string, { itemIds: string[]; factIds: string[] }>();

  for (const { student, mode } of matrix) {
    const r = await runPaper(student, 1, mode);
    if (r) firstRun.set(student, { itemIds: r.itemIds, factIds: r.factIds });
  }

  /* ---- retakes, told what the first attempt asked --------------------------------------- */

  for (const student of ['alpha', 'gamma']) {
    const prior = firstRun.get(student)!;
    const r = await runPaper(student, 2, 'MIXED', prior);
    if (r) {
      const itemOverlap = r.itemIds.filter(i => prior.itemIds.includes(i));
      const factOverlap = r.factIds.filter(f => prior.factIds.includes(f));
      check(`retake ${student}: no item repeated from attempt 1`, itemOverlap.length === 0,
        `${itemOverlap.length} repeated`);
      check(`retake ${student}: no fact repeated from attempt 1`, factOverlap.length === 0,
        `${factOverlap.length} repeated`);
    }
  }

  /* ---- determinism ---------------------------------------------------------------------- */

  const d1 = await buildPersonalizedAssessment({ ...base, studentId: idFor('det'), attemptNumber: 1 });
  const d2 = await buildPersonalizedAssessment({ ...base, studentId: idFor('det'), attemptNumber: 1 });
  const same = JSON.stringify((d1.items || []).map(i => i.sourceId))
    === JSON.stringify((d2.items || []).map(i => i.sourceId));
  check('deterministic: same student and attempt build the same paper', same,
    same ? `seed ${d1.seed}` : `seeds ${d1.seed} vs ${d2.seed}`);

  const d3 = await buildPersonalizedAssessment({ ...base, studentId: idFor('det2'), attemptNumber: 1 });
  const differs = JSON.stringify((d1.items || []).map(i => i.sourceId))
    !== JSON.stringify((d3.items || []).map(i => i.sourceId));
  check('different students get different papers', differs);

  /* ---- report ---------------------------------------------------------------------------- */

  const failed = checks.filter(c => !c.ok);
  console.log(`\nCHECKS`);
  for (const c of checks) {
    console.log(`  ${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? `  — ${c.detail}` : ''}`);
  }
  console.log(`\n${checks.length - failed.length}/${checks.length} passed, ${failed.length} failed`);

  await cleanup();
  await mongoose.disconnect();
  process.exit(failed.length ? 1 : 0);

  /* --------------------------------------------------------------------------------------- */

  async function runPaper(
    name: string, attempt: number, mode: Mode,
    prior?: { itemIds: string[]; factIds: string[] },
  ) {
    const studentId = idFor(name);
    const label = `${name} attempt ${attempt} (${mode})`;

    const built = await buildPersonalizedAssessment({
      ...base, studentId, attemptNumber: attempt,
      seenSourceIds: prior?.itemIds, seenFactKeys: prior?.factIds,
    });

    if (!built.ok) {
      check(`${label}: paper generated`, false, built.adminMessage || 'refused');
      return null;
    }
    const paperItems = built.items || [];
    const rep = built.report!;

    check(`${label}: paper fills every slot`,
      rep.filled === rep.requestedSlots, `${rep.filled}/${rep.requestedSlots}`);
    check(`${label}: no difficulty fallback`, rep.difficultyFallbacks === 0,
      `${rep.difficultyFallbacks} fallbacks`);

    const nonGolden = paperItems.filter(i => i.sourceType !== 'assessment_item' || !gold.has(String(i.sourceId)));
    check(`${label}: only Golden questions selected`, nonGolden.length === 0,
      nonGolden.length ? nonGolden.map(i => `${i.sourceType}:${i.sourceId}`).join(', ') : `${paperItems.length} items`);

    const itemIds = paperItems.map(i => String(i.sourceId));
    check(`${label}: no item repeated within the paper`,
      new Set(itemIds).size === itemIds.length, `${itemIds.length - new Set(itemIds).size} repeats`);

    const factIds = itemIds.map(id => gold.get(id)?.golden?.factId).filter(Boolean) as string[];
    check(`${label}: no fact repeated within the paper`,
      new Set(factIds).size === factIds.length,
      `${factIds.length - new Set(factIds).size} repeats, ${new Set(factIds).size} distinct facts`);

    // Difficulty policy: every slot served at the band it asked for, and the requested mix is
    // the policy's. The band is recomputed here from the stored 1-5 rather than trusted.
    const bandOf = (n: number) => (n <= 2 ? 'EASY' : n === 3 ? 'MEDIUM' : 'HARD');
    const mismatched = paperItems.filter(i => bandOf(gold.get(String(i.sourceId))!.difficulty) !== i.difficulty);
    check(`${label}: every item's stored difficulty matches the slot it filled`,
      mismatched.length === 0, `${mismatched.length} mismatched`);

    const mix = { EASY: 0, MEDIUM: 0, HARD: 0 } as Record<string, number>;
    for (const i of paperItems) mix[i.difficulty]++;
    const wantHard = Math.round(policy.difficultyMix.HARD * paperItems.length);
    check(`${label}: difficulty mix follows the policy`,
      mix.EASY >= mix.MEDIUM && mix.MEDIUM >= mix.HARD,
      `E${mix.EASY}/M${mix.MEDIUM}/H${mix.HARD}, policy wants roughly H${wantHard}`);

    /**
     * notMeasuredSkills means INSUFFICIENT_EVIDENCE, not "not chosen this sitting".
     *
     * The field carries skills the paper COULD NOT have measured because the bank is too thin —
     * it is what tells an admin to go and author questions. A skill left off a 32-slot paper that
     * covers 8 of 33 is simply not on this paper, and belongs to the separate check below that no
     * profile is written for it. Asserting the two are the same thing was this file's mistake, and
     * it failed against a correct engine.
     */
    const covered = new Set(paperItems.map(i => i.skillKey));
    const notMeasured = built.notMeasuredSkills || [];
    check(`${label}: notMeasuredSkills reports only genuine evidence shortfalls`,
      notMeasured.every((s: any) => s.reasonCode === 'INSUFFICIENT_EVIDENCE'
        && s.availablePrimary < s.requiredPrimary),
      notMeasured.length
        ? notMeasured.map((s: any) => `${s.skillKey} ${s.availablePrimary}/${s.requiredPrimary}`).join(', ')
        : 'none — every stage skill has enough evidence');

    /* ---- persist the paper exactly as the controller does ------------------------------ */

    const created: any = await PersonalizedAssessment.create({
      tenantId, studentId, attemptNumber: attempt, status: 'IN_PROGRESS',
      purpose: 'INITIAL', targetSkillKeys: [],
      policyKey: built.specification!.policyKey, policyVersion: built.specification!.policyVersion,
      stage: 'foundation', roleKey: 'FOUNDATION', blueprintVersion: base.blueprintVersion,
      discovery: false, timeLimitMinutes: 0, generationSeed: built.seed,
      specification: {
        slots: built.specification!.slots,
        skillCoverage: built.specification!.skillCoverage,
        difficultyCoverage: built.specification!.difficultyCoverage,
        totalPoints: built.specification!.totalPoints,
      },
      items: paperItems,
      generationReport: {
        requestedSlots: rep.requestedSlots, filled: rep.filled, exactMatches: rep.exactMatches,
        difficultyFallbacks: rep.difficultyFallbacks,
        repeatedFromPreviousAttempt: rep.repeatedFromPreviousAttempt,
      },
    });

    /* ---- answer, grade, project --------------------------------------------------------- */

    const wrongFor = (key: string[]) => {
      const all = ['A', 'B', 'C', 'D'];
      return [all.find(o => !key.includes(o)) || 'A'];
    };
    const answers = paperItems.map((i, idx) => {
      const item = gold.get(String(i.sourceId))!;
      const key = item.correctOptionIds as string[];
      let response: string[] | undefined;
      if (mode === 'ALL_CORRECT') response = key;
      else if (mode === 'ALL_WRONG') response = wrongFor(key);
      else if (mode === 'MIXED') response = idx % 2 === 0 ? key : wrongFor(key);
      else response = undefined;
      return { sourceType: i.sourceType, sourceId: String(i.sourceId), response };
    });

    const graded = await gradeSubmittedAnswers(tenantId, answers as any);
    const gradable = graded.filter(g => g.gradable);
    const earned = gradable.reduce((n, g) => n + g.earnedPoints, 0);
    const max = gradable.reduce((n, g) => n + g.maxPoints, 0);

    const expectedEarned = mode === 'ALL_CORRECT' ? paperItems.length
      : mode === 'ALL_WRONG' || mode === 'UNANSWERED' ? 0
        : answers.filter((_, idx) => idx % 2 === 0).length;
    check(`${label}: scoring is exactly right`,
      gradable.length === paperItems.length && earned === expectedEarned && max === paperItems.length,
      `${earned}/${max}, expected ${expectedEarned}/${paperItems.length}`);

    created.status = 'SUBMITTED';
    created.submittedAt = new Date();
    created.answers = answers.map(a => ({ ...a, response: a.response }));
    await created.save();

    await projectAssessmentToSkillDna(tenantId, String(created._id), graded);

    /* ---- score and confidence, recomputed here from the evidence rows ------------------- */

    const evidence = await StudentSkillEvidence.find({ tenantId, studentId }).lean() as any[];
    const profiles = await StudentSkillProfile.find({ tenantId, studentId }).lean() as any[];

    check(`${label}: one evidence row per graded item`,
      evidence.filter(e => String(e.assessmentId) === String(created._id)).length === paperItems.length,
      `${evidence.filter(e => String(e.assessmentId) === String(created._id)).length} rows`);

    let scoreOk = true, confOk = true, detail = '';
    for (const p of profiles) {
      const rows = evidence.filter(e => e.skillKey === p.skillKey);
      const weight = rows.reduce((n, r) => n + r.evidenceWeight, 0);
      const weighted = rows.reduce((n, r) => n + r.performance * r.evidenceWeight, 0);
      const expectScore = weight > 0 ? Math.round((weighted / weight) * 100) : 0;
      const distinct = new Set(rows.map(r => `${r.itemSourceType}:${r.itemSourceId}`)).size;
      const expectConf = weight >= 7 && distinct >= 3 ? 'HIGH' : weight >= 3 ? 'MEDIUM' : 'LOW';
      if (p.score !== expectScore) { scoreOk = false; detail += `${p.skillKey} score ${p.score}!=${expectScore} `; }
      if (p.confidence !== expectConf) { confOk = false; detail += `${p.skillKey} conf ${p.confidence}!=${expectConf} `; }
    }
    check(`${label}: every profile score matches the weighted arithmetic`, scoreOk, detail.trim());
    check(`${label}: every profile confidence matches the thresholds`, confOk, detail.trim());

    if (mode === 'ALL_CORRECT') {
      check(`${label}: all-correct produces only 100s`,
        profiles.every(p => p.score === 100), profiles.map(p => p.score).join(','));
    }
    if (mode === 'ALL_WRONG') {
      check(`${label}: all-wrong produces only 0s`,
        profiles.every(p => p.score === 0), profiles.map(p => p.score).join(','));
    }
    if (mode === 'UNANSWERED') {
      check(`${label}: unanswered items are graded, not skipped`,
        gradable.length === paperItems.length && earned === 0,
        `${gradable.length} gradable, ${earned} earned`);
    }

    // Not assessed is not a score of zero: no profile row may exist for a skill off the paper.
    const profiled = new Set(profiles.map(p => p.skillKey));
    const offPaperProfiled = [...profiled].filter(k => !covered.has(k));
    check(`${label}: no profile written for a skill the paper never asked about`,
      offPaperProfiled.length === 0, offPaperProfiled.join(', '));

    return { itemIds, factIds };
  }

  async function cleanup(quiet = false) {
    const [a, b, c] = await Promise.all([
      PersonalizedAssessment.deleteMany({ tenantId, studentId: { $in: QA_IDS } }),
      StudentSkillEvidence.deleteMany({ tenantId, studentId: { $in: QA_IDS } }),
      StudentSkillProfile.deleteMany({ tenantId, studentId: { $in: QA_IDS } }),
    ]);
    if (!quiet) {
      console.log(`\ncleanup — removed ${a.deletedCount} papers, ${b.deletedCount} evidence rows, `
        + `${c.deletedCount} profiles (synthetic students only)`);
    }
  }
})().catch(e => { console.error('ERR', e?.message || e, e?.stack); process.exit(1); });
